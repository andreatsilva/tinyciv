import http from 'node:http';
import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {createRealm,tick,saveRealm,loadRealm,type Realm} from '../src/settlement.ts';
import {playerName,roomSeed,applyOrder} from '../src/protocol.ts';
type Player={name:string;city:number;hash:string};
type Room={game:Realm;players:Player[];clients:Map<WebSocket,number>;lastTerrain:string[];lastSave:number};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function startHost(options:{port?:number;dataDir?:string;origins?:string[];maxRooms?:number}={}){
  const rooms=new Map<string,Room>(),attempts=new Map<string,{n:number;at:number}>();
  const dir=options.dataDir||path.resolve('data');mkdirSync(dir,{recursive:true});
  const identityFile=path.join(dir,'host-id');const hostId=existsSync(identityFile)?readFileSync(identityFile,'utf8').trim():randomBytes(16).toString('hex');if(!existsSync(identityFile))writeFileSync(identityFile,hostId);
  const file=(seed:string)=>path.join(dir,digest(seed)+'.json');
  function save(room:Room){const dest=file(room.game.seed);writeFileSync(dest+'.tmp',JSON.stringify({format:1,players:room.players,world:saveRealm(room.game)}));renameSync(dest+'.tmp',dest);room.lastSave=Date.now();}
  function roomFor(seed:string){let room=rooms.get(seed);if(room)return room;
    if(rooms.size>=(options.maxRooms??3))throw Error('Host has reached its three-world limit. Ask the host to restart for a different seed.');
    let game:Realm,players:Player[]=[];
    if(existsSync(file(seed))){const d=JSON.parse(readFileSync(file(seed),'utf8'));if(d.format!==1||!Array.isArray(d.players)||d.players.length>5||!d.players.every((p:Player,i:number)=>p.city===i&&playerName(p.name)&&/^[a-f0-9]{64}$/.test(p.hash)))throw Error('The host could not restore this world.');game=loadRealm(d.world);players=d.players;}
    else{game=createRealm(seed,16);game.humanCities=[];game.disabledCities=[0,1,2,3,4];for(const c of game.cities.slice(0,5)){c.stock={wood:230,stone:150,iron:95,food:180};c.troops=8;game.workers.filter(w=>w.city===c.id).forEach((w,i)=>w.job=i<4?'wood':i<7?'food':i===7?'stone':i===8?'iron':'builder');}}
    room={game,players,clients:new Map(),lastTerrain:game.cells.map(c=>`${c.ground},${c.amount},${c.traffic}`),lastSave:Date.now()};rooms.set(seed,room);return room;
  }
  const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.writeHead(req.url==='/health'?200:404);res.end(JSON.stringify(req.url==='/health'?{ok:true,game:'Tiny Civilization',protocol:1,rooms:rooms.size}: {error:'Not found'}));});
  const wss=new WebSocketServer({noServer:true,maxPayload:16384,perMessageDeflate:{threshold:1024,serverNoContextTakeover:true,clientNoContextTakeover:true}});
  const origins=options.origins||['https://andreatsilva.github.io','http://127.0.0.1:4173','http://127.0.0.1:5173','http://127.0.0.1:5174','http://localhost:4173'];
  server.on('upgrade',(req,socket,head)=>{if(req.url!=='/play'||wss.clients.size>=32||req.headers.origin&&!origins.includes(req.headers.origin)){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  const send=(ws:WebSocket,data:unknown)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<1000000)ws.send(JSON.stringify(data));};
  function frame(room:Room,full=false){const g=room.game;const terrain:gTerrain=[];g.cells.forEach((c,i)=>{const key=`${c.ground},${c.amount},${c.traffic}`;if(full?c.ground!==g.original[i]||c.traffic>0||c.amount!==(g.original[i]==='forest'?96:g.original[i]==='stone'?260:g.original[i]==='iron'?200:0):key!==room.lastTerrain[i])terrain.push([i,c.ground,c.amount,c.traffic]);if(!full)room.lastTerrain[i]=key;});
    return {type:'state',seed:g.seed,time:g.time,cities:g.cities,buildings:g.buildings,workers:g.workers.map(w=>({...w,path:[],pathAt:0})),armies:g.armies.map(a=>({...a,path:[],pathAt:0})),soldiers:g.soldiers?.map(u=>({...u,path:[],pathAt:0})),effects:g.effects,events:g.events,terrain,humanCities:g.humanCities,disabledCities:g.disabledCities,roster:room.players.map(p=>({name:p.name,city:p.city,online:[...room.clients.values()].includes(p.city)}))};
  }
  type gTerrain=[number,string,number,number][];
  wss.on('connection',(ws,req)=>{
    send(ws,{type:'hello',hostId});
    let joined:Room|undefined,owner=-1,windowAt=Date.now(),commands=0;const deadline=setTimeout(()=>ws.close(1008,'Join required'),12000);
    ws.on('error',()=>{});ws.on('close',()=>{clearTimeout(deadline);joined?.clients.delete(ws);if(joined)try{save(joined);}catch{console.error('World save failed; check DATA_DIR permissions.');}});
    ws.on('message',raw=>{try{
      const msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object')throw Error('Invalid message.');
      if(!joined){
        if(msg.type!=='join'||msg.protocol!==1)throw Error('Reload the game to use the current multiplayer version.');
        const ip=req.socket.remoteAddress||'local',now=Date.now();let attempt=attempts.get(ip);if(!attempt||now-attempt.at>60000){attempt={n:0,at:now};attempts.set(ip,attempt);}if(++attempt.n>20)throw Error('Too many join attempts. Try again in a minute.');
        const name=playerName(msg.name),seed=roomSeed(msg.seed);if(!name)throw Error('Use 2–20 letters, numbers, spaces, underscores, or hyphens for your name.');if(!seed)throw Error('Seed must be 3–32 letters, numbers, underscores, or hyphens.');
        const room=roomFor(seed);let p=room.players.find(p=>p.name.toLowerCase()===name.toLowerCase());let token='';
        if(p){if(typeof msg.token!=='string'||digest(msg.token)!==p.hash)throw Error('That name is already reserved. Use your original browser or a different name.');}
        else{if(room.players.length>=5)throw Error('This world is full (five players).');owner=room.players.length;token=randomBytes(32).toString('hex');p={name,city:owner,hash:digest(token)};room.players.push(p);const c=room.game.cities[owner];c.ruler=name;c.protectedUntil=room.game.time+120;room.game.humanCities!.push(owner);room.game.disabledCities=room.game.disabledCities!.filter(i=>i!==owner);}
        owner=p.city;for(const [other,id]of room.clients)if(id===owner){room.clients.delete(other);other.close(4001,'Opened in another tab');}joined=room;room.clients.set(ws,owner);clearTimeout(deadline);save(room);send(ws,{type:'joined',player:owner,token,protocol:1});send(ws,frame(room,true));return;
      }
      if(msg.type!=='order'||!Number.isInteger(msg.id)||msg.id<0||msg.id>1000000000)throw Error('Invalid command envelope.');
      if(Date.now()-windowAt>1000){commands=0;windowAt=Date.now();}if(++commands>20){send(ws,{type:'result',id:msg.id,error:'Too many orders. Slow down.'});return;}
      const error=applyOrder(joined.game,owner,msg.order);if(!error){const state=frame(joined);for(const client of joined.clients.keys())send(client,state);}send(ws,{type:'result',id:msg.id,error});
    }catch(e){send(ws,{type:'error',error:e instanceof Error?e.message:'Invalid request.'});if(!joined)ws.close(1008,'Join failed');}});
  });
  let at=Date.now(),acc=0,lastBroadcast=0;
  const timer=setInterval(()=>{const now=Date.now();acc+=Math.min(.5,(now-at)/1000);at=now;while(acc>=.1){for(const room of rooms.values())if(room.clients.size)tick(room.game,.1);acc-=.1;}
    if(now-lastBroadcast>=200){lastBroadcast=now;for(const room of rooms.values())if(room.clients.size){const data=JSON.stringify(frame(room));for(const ws of room.clients.keys()){if(ws.bufferedAmount>1000000){ws.close(1013,'Connection too slow');continue;}if(ws.readyState===WebSocket.OPEN)ws.send(data);}}}
    for(const room of rooms.values())if(now-room.lastSave>10000)try{save(room);}catch{console.error('World save failed; check DATA_DIR permissions.');}
    for(const [ip,a]of attempts)if(now-a.at>60000)attempts.delete(ip);
  },50);
  server.listen(options.port??8787,'127.0.0.1');
  return {server,rooms,async close(){clearInterval(timer);for(const r of rooms.values())save(r);for(const ws of wss.clients)ws.terminate();await new Promise<void>(resolve=>wss.close(()=>server.close(()=>resolve())));}};
}
