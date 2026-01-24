const fetch = require('node-fetch');
const URL = require('url').URL;

function extractChannelIdOrUsername(chUrl){
  if(!chUrl) return null;
  try{
    const u = new URL(chUrl);
    const p = u.pathname.replace(/\/+$/,'');
    // /channel/CHANNEL_ID or /user/USERNAME or /@handle
    const parts = p.split('/').filter(Boolean);
    if(parts[0] === 'channel' && parts[1]) return { type: 'id', id: parts[1] };
    if(parts[0] === 'user' && parts[1]) return { type: 'user', id: parts[1] };
    if(parts[0] && parts[0].startsWith('@')) return { type: 'handle', id: parts[0].slice(1) };
    // fallback: last part
    if(parts.length) return { type: 'unknown', id: parts[parts.length-1] };
  }catch(e){
    return null;
  }
}

async function fetchChannelVideos(apiKey, channelUrl){
  if(!apiKey) return [];
  const info = extractChannelIdOrUsername(channelUrl);
  if(!info) return [];

  // If we have a channel ID, use search endpoint with channelId
  try{
    if(info.type === 'id'){
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(info.id)}&order=date&maxResults=5&type=video&key=${encodeURIComponent(apiKey)}`;
      const r = await fetch(url);
      if(!r.ok) return [];
      const j = await r.json();
      return (j.items||[]).map(it=>({ id: it.id.videoId, title: it.snippet.title, desc: it.snippet.description, url: `https://www.youtube.com/watch?v=${it.id.videoId}` }));
    }

    // If user or handle, resolve channel id first
    if(info.type === 'user' || info.type === 'handle' || info.type === 'unknown'){
      // try channels.list with forUsername (user) or search for handle
      if(info.type === 'user'){
        const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(info.id)}&key=${encodeURIComponent(apiKey)}`;
        const r1 = await fetch(chUrl);
        if(r1.ok){
          const j1 = await r1.json();
          const ch = j1.items && j1.items[0] && j1.items[0].id;
          if(ch) return await fetchChannelVideos(apiKey, `https://www.youtube.com/channel/${ch}`);
        }
      }
      // fallback: search for channel by query
      const q = encodeURIComponent(info.id);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=channel&maxResults=1&key=${encodeURIComponent(apiKey)}`;
      const r = await fetch(url);
      if(!r.ok) return [];
      const j = await r.json();
      const chan = j.items && j.items[0] && j.items[0].snippet && j.items[0].snippet.channelId;
      if(chan) return await fetchChannelVideos(apiKey, `https://www.youtube.com/channel/${chan}`);
    }
  }catch(e){
    console.error('YouTube API error', e && e.message);
    return [];
  }

  return [];
}

module.exports = { fetchChannelVideos };
