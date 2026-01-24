const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { fetchFeed } = require('./lib/rss');
const { fetchChannelVideos } = require('./lib/youtube');
const { generateArticle } = require('./lib/gemini');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(ROOT, 'config');

function loadYaml(name){
  const p = path.join(CONFIG_DIR, name);
  if(!fs.existsSync(p)) return null;
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

async function collectCandidates(){
  const sourcesCfg = loadYaml('sources.yml');
  const youtubeCfg = loadYaml('youtube-channels.yml');
  const candidates = [];
  const discoveredLogPath = path.join(ROOT, 'logs');
  if(!fs.existsSync(discoveredLogPath)) fs.mkdirSync(discoveredLogPath, { recursive: true });
  const discoveredCsv = path.join(discoveredLogPath, 'discovered_feeds.csv');
  if(!fs.existsSync(discoveredCsv)) fs.writeFileSync(discoveredCsv, 'ts,source_name,source_page,discovered_feed\n', 'utf8');

  if(sourcesCfg && sourcesCfg.sources){
    for(const s of sourcesCfg.sources){
      if(s.rss){
        const res = await fetchFeed(s.rss);
        const items = res.items || [];
        const discovered = res.discovered || [];
        // log discovered feeds
        if(discovered && discovered.length){
          for(const f of discovered){
            const line = `${new Date().toISOString()},"${s.name}","${s.rss}","${f}"\n`;
            fs.appendFileSync(discoveredCsv, line, 'utf8');
          }
          // If config rss seems to be an index page (no .xml or contains '/rss-feeds' or 'feed' but not an item), replace with first discovered
          try{
            const current = s.rss || '';
            const first = discovered[0];
            if(first && first !== current){
              // update config file on disk: load YAML, find this source by name/url and set rss
              const cfgPath = path.join(CONFIG_DIR, 'sources.yml');
              try{
                const raw = fs.readFileSync(cfgPath, 'utf8');
                const cfg = yaml.load(raw);
                if(cfg && Array.isArray(cfg.sources)){
                  let changed = false;
                  for(const ss of cfg.sources){
                    if(ss.name === s.name || ss.url === s.url){
                      ss.rss = first;
                      changed = true;
                    }
                  }
                  if(changed){
                    fs.writeFileSync(cfgPath, yaml.dump(cfg, { lineWidth: 120 }), 'utf8');
                    console.log('Updated config/sources.yml for', s.name, '->', first);
                  }
                }
              }catch(e){ /* ignore write errors */ }
            }
          }catch(e){ /* ignore */ }
        }

        for(const it of items.slice(0,5)){
          candidates.push({
            id: it.guid || it.link || (`src-${Date.now()}`),
            title: it.title,
            excerpt: it.contentSnippet || it.content || '',
            url: it.link,
            sources: [{ name: s.name, url: it.link, type: s.type }]
          });
        }
      }
    }
  }

  if(youtubeCfg && youtubeCfg.youtube_channels){
    const apiKey = process.env.YOUTUBE_API_KEY;
    for(const ch of youtubeCfg.youtube_channels){
      const videos = await fetchChannelVideos(apiKey, ch.channel_url);
      for(const v of (videos || []).slice(0,3)){
        candidates.push({ id: v.id || (`yt-${Date.now()}`), title: v.title, excerpt: v.desc || '', url: v.url, youtube: true, sources: [{ name: ch.channel_name, url: ch.channel_url, type: ch.type }] });
      }
    }
  }

  return candidates;
}

function prependArticleToNews(articleObj){
  const newsPath = path.join(ROOT, 'news.json');
  let news = { articles: [] };
  if(fs.existsSync(newsPath)){
    try{ news = JSON.parse(fs.readFileSync(newsPath,'utf8')); }catch(e){ console.error('news.json parse failed', e.message); }
  }
  news.articles = news.articles || [];
  // avoid exact id duplicate
  if(news.articles.find(a => a.id === articleObj.id)){
    console.log('Article id already present, skipping:', articleObj.id);
    return false;
  }
  news.articles.unshift(articleObj);
  fs.writeFileSync(newsPath, JSON.stringify(news, null, 2), 'utf8');
  return true;
}

async function run(){
  console.log('Loading configs...');
  const keywords = loadYaml('keywords.yml');
  const safety = loadYaml('safety.yml');

  console.log('Collecting candidates...');
  const candidates = await collectCandidates();
  console.log('Candidates found:', candidates.length);

  for(const c of candidates){
    try{
      console.log('Generating article for:', c.title || c.id);
      const jsonStr = await generateArticle(c);
      // save temp article
      const tmpPath = path.join(ROOT, 'article.tmp.json');
      fs.writeFileSync(tmpPath, jsonStr, 'utf8');

      // call classifier/dedup python script
      let py = spawnSync('python', [path.join(ROOT,'classify_and_dedup.py'), tmpPath, '--news', path.join(ROOT,'news.json')], { encoding: 'utf8' });
      if(py.error || py.status === 9009){
        // On Windows the 'python' command may not be available; try 'py' then 'python3'
        py = spawnSync('py', [path.join(ROOT,'classify_and_dedup.py'), tmpPath, '--news', path.join(ROOT,'news.json')], { encoding: 'utf8' });
      }
      if((py.error && !py.status) || py.status === 9009){
        // try python3
        py = spawnSync('python3', [path.join(ROOT,'classify_and_dedup.py'), tmpPath, '--news', path.join(ROOT,'news.json')], { encoding: 'utf8' });
      }
      if(py.error){
        console.error('Failed to run classifier:', py.error.message);
        console.error('Spawn error, stderr:', py.stderr);
        continue;
      }
      if(py.status !== 0){
        console.error('Classifier exited with code', py.status);
        console.error('stderr:', py.stderr);
        continue;
      }
      const out = py.stdout || '';
      if(!out.trim()){
        console.error('Classifier produced no output. stderr:', py.stderr);
        continue;
      }
      let parsed;
      try{
        parsed = JSON.parse(out);
      }catch(e){
        console.error('Failed to parse classifier output as JSON:', e.message);
        console.error('Raw output:\n', out);
        console.error('stderr:\n', py.stderr);
        continue;
      }
      if(parsed.duplicate_check && parsed.duplicate_check.duplicate){
        console.log('Duplicate detected, skipping:', parsed.duplicate_check.reason);
        continue;
      }

      const article = parsed.bundle;
      // safety: require sources if config enforces
      if(safety && safety.safety && safety.safety.citation_required){
        if(!(article.sources && article.sources.length) && !(article.official_docs && article.official_docs.length)){
          console.log('Skipping article due to missing citations.');
          continue;
        }
      }

      const added = prependArticleToNews(article);
      if(added) console.log('Article added:', article.id);

    }catch(e){
      console.error('Pipeline error for candidate:', c.id, e && e.message);
    }
  }

  console.log('Pipeline finished.');
}

run().catch(e => { console.error(e); process.exit(1); });
