import {writeFileSync,existsSync} from 'node:fs';
const raw=process.argv[2];if(!raw)throw Error('Usage: npm run set-server -- https://YOUR-ADDRESS.trycloudflare.com');
const u=new URL(raw);if(u.username||u.password||u.search||u.hash)throw Error('Use a plain host address.');
if(u.protocol==='https:')u.protocol='wss:';if(u.protocol==='http:')u.protocol='ws:';
if(u.protocol!=='wss:'&&!(u.protocol==='ws:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('Use wss:// for internet hosting.');u.pathname='/play';
const config=JSON.stringify({server:u.toString()},null,2)+'\n';
for(const directory of ['public','dist','docs']){const dest=new URL(`../${directory}/multiplayer.json`,import.meta.url);if(directory==='public'||existsSync(new URL(`../${directory}/`,import.meta.url)))writeFileSync(dest,config);}
console.log('Server updated. Commit public/multiplayer.json and docs/multiplayer.json, then push to update Pages.');
