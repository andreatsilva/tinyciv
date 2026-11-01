import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {startHost} from '../server/host.ts';
test('five real sockets share a world; ownership, reconnect, capacity, seed isolation and persistence',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'tiny-civ-test-')),host=startHost({port:0,dataDir:dir});await once(host.server,'listening');const port=(host.server.address() as any).port;const sockets:WebSocket[]=[];
  const connect=async(name:string,seed='test-room',token='')=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/play`);sockets.push(ws);const messages:any[]=[];ws.on('message',b=>messages.push(JSON.parse(b.toString())));await once(ws,'open');ws.send(JSON.stringify({type:'join',protocol:1,name,seed,token}));return {ws,messages};};
  const wait=async(c:{messages:any[]},type:string)=>{const until=Date.now()+8000;while(Date.now()<until){const m=c.messages.find(m=>m.type===type);if(m)return m;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out waiting for '+type);};
  try{
    const players=[];for(let i=0;i<5;i++){const c=await connect('Player '+i);const joined=await wait(c,'joined');assert.equal(joined.player,i);assert.ok(joined.token);players.push({...c,token:joined.token});}
    const full=await connect('Sixth');assert.match((await wait(full,'error')).error,/full/);
    const state=await wait(players[0],'state'),foreign=state.buildings.find((b:any)=>b.city===1);players[0].ws.send(JSON.stringify({type:'order',id:1,order:{type:'upgrade',id:foreign.id}}));assert.match((await wait(players[0],'result')).error,/your buildings/);
    players[1].messages.length=0;players[1].ws.send(JSON.stringify({type:'order',id:2,order:{type:'deploy',kind:'spear',count:2,owner:0}}));assert.equal((await wait(players[1],'result')).error,'');await new Promise(r=>setTimeout(r,300));const latest=players[0].messages.filter(m=>m.type==='state').at(-1);assert.equal(latest.soldiers.filter((s:any)=>s.city===1).length,2);assert.equal(latest.roster.length,5);
    const denied=await connect('Player 1');assert.match((await wait(denied,'error')).error,/reserved/);players[1].ws.close();await once(players[1].ws,'close');const back=await connect('Player 1','test-room',players[1].token);assert.equal((await wait(back,'joined')).player,1);assert.equal((await wait(back,'state')).soldiers.filter((s:any)=>s.city===1).length,2);
    const other=await connect('Other','other-seed');assert.equal((await wait(other,'joined')).player,0);assert.equal((await wait(other,'state')).soldiers.length,0);
    const time=host.rooms.get('test-room')!.game.time;await host.close();const restored=startHost({port:0,dataDir:dir});await once(restored.server,'listening');try{const p=(restored.server.address() as any).port;const ws=new WebSocket(`ws://127.0.0.1:${p}/play`);sockets.push(ws);const frames:any[]=[];ws.on('message',b=>frames.push(JSON.parse(b.toString())));await once(ws,'open');ws.send(JSON.stringify({type:'join',protocol:1,name:'Player 1',seed:'test-room',token:players[1].token}));const s=await wait({messages:frames},'state');assert.ok(s.time>=time);assert.equal(s.soldiers.filter((s:any)=>s.city===1).length,2);}finally{await restored.close();}
  }finally{for(const ws of sockets)ws.terminate();if(host.server.listening)await host.close();rmSync(dir,{recursive:true,force:true});}
});
