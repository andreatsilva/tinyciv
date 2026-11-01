import {UNITS,unlockError,tickMilitary,validMilitary,type Soldier,type Shot,type Technology,type RecruitKind} from './military.ts';
export const MAP_SIZE = 256;
export type Resource = 'wood' | 'stone' | 'iron' | 'food';
export type Job = Resource | 'builder';
export type Ground = 'grass' | 'sand' | 'water' | 'forest' | 'stone' | 'iron';
export type BuildingKind = 'hall' | 'house' | 'farm' | 'lumber' | 'quarry' | 'mine' | 'store' | 'barracks' | 'watchtower';
export type Stock = Record<Resource, number>;
export interface Cell { ground: Ground; amount: number; variation: number; traffic: number }
export interface Building { id: number; city: number; kind: BuildingKind; x: number; y: number; level: number; progress: number; complete: boolean }
export interface Worker { id: number; city: number; name: string; x: number; y: number; job: Job; state: 'idle' | 'walking' | 'gathering' | 'returning' | 'building'; path: number[]; pathAt: number; target: number; targetBuilding: number; clock: number; cargo: number; cargoType: Resource }
export interface City { id: number; name: string; ruler: string; color: string; x: number; y: number; stock: Stock; delivered: Stock; troops: number; relation: number; personality: 'Merchant' | 'Builder' | 'Warlord'; training: {kind:RecruitKind;left:number}[]; nextDecision: number; nextRaid: number; fallen: boolean; military?:{archer:number;cavalry:number};technology?:Technology;health?:number;lastDamage?:number;recoverUntil?:number;protectedUntil?:number }
export interface Army { id:number; city:number; target:number; x:number; y:number; troops:number; path:number[]; pathAt:number; returning:boolean; cargo:Stock }
export interface GameEvent { time:number; text:string; kind:'world'|'build'|'delivery'|'battle'|'diplomacy' }
export interface Realm { version:2; seed:string; time:number; rng:number; nextId:number; cells:Cell[]; cities:City[]; buildings:Building[]; workers:Worker[]; armies:Army[]; events:GameEvent[]; blocked:Set<number>; original:Ground[];humanCities?:number[];disabledCities?:number[];soldiers?:Soldier[];effects?:Shot[] }
export const RESOURCES:Resource[]=['wood','stone','iron','food'];
export const JOBS:Job[]=['wood','food','stone','iron','builder'];
export const zeroStock=():Stock=>({wood:0,stone:0,iron:0,food:0});
export const CATALOG:Record<BuildingKind,{name:string;description:string;width:number;height:number;seconds:number;cost:Partial<Stock>;icon:string}>={
  hall:{name:'Village hall',description:'The heart of your settlement. Upgrades improve gathering speed.',width:3,height:3,seconds:35,cost:{wood:120,stone:100,iron:40},icon:'hall'},
  house:{name:'Cottage',description:'Room for 6 more villagers.',width:2,height:2,seconds:20,cost:{wood:45,stone:15},icon:'house'},
  farm:{name:'Farm',description:'A renewable food source for your farmers.',width:3,height:2,seconds:22,cost:{wood:60,stone:20},icon:'farm'},
  lumber:{name:'Lumber camp',description:'Woodcutters gather 35% faster. Also accepts deliveries.',width:2,height:2,seconds:26,cost:{wood:75,stone:35},icon:'tree'},
  quarry:{name:'Stoneworks',description:'Stone gatherers work 35% faster. Also accepts deliveries.',width:2,height:2,seconds:28,cost:{wood:70,iron:20},icon:'stone'},
  mine:{name:'Ironworks',description:'Iron miners work 35% faster. Also accepts deliveries.',width:2,height:2,seconds:30,cost:{wood:80,stone:55},icon:'iron'},
  store:{name:'Storehouse',description:'Adds 500 storage and a nearby delivery point.',width:2,height:2,seconds:24,cost:{wood:70,stone:40},icon:'store'},
  barracks:{name:'Barracks',description:'Train spearmen to protect the village and raid rivals.',width:3,height:2,seconds:32,cost:{wood:100,stone:70,iron:35},icon:'war'},
  watchtower:{name:'Watchtower',description:'Each level adds 30% to your defending army strength.',width:2,height:2,seconds:30,cost:{wood:80,stone:65,iron:20},icon:'tower'}
};
const COLORS=['#537c55','#b58743','#b7644e','#5d8b9f','#8d78a4','#ab758e','#758b41','#9a8061'];
const CITY_NAMES=['Willowmere','Oakfall','Emberwick','Stoneford','Briarhaven','Ravensreach','Alderbrook','Goldhollow','Thornfield','Ironvale','Mossgate','Ashenford','Pinewatch','Silvermere','Redhaven','Wolfsrest','Windholm','Copperfen','Fernhold','Duskmoor','Frostwick','Dawnkeep','Westridge','Juniper','Northstead','Hawthorne','Clayhaven','Birchfall','Rosewatch','Cinderford','Greenmarch','Stillwater','Highgrove','Foxden','Mistwood','Oldstone'];
const NAMES=['Milo','Ada','Elin','Rowan','Finn','Mara','Otto','Iris','Theo','Nora','Hugo','Cleo','Arlo','Lena','Owen','Sage'];
export const indexOf=(x:number,y:number)=>y*MAP_SIZE+x;
export const coords=(i:number)=>({x:i%MAP_SIZE,y:Math.floor(i/MAP_SIZE)});
export function hashText(s:string){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function mix(x:number,y:number,seed:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise(x:number,y:number,scale:number,seed:number){const xx=x/scale,yy=y/scale,ix=Math.floor(xx),iy=Math.floor(yy);let fx=xx-ix,fy=yy-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);return (mix(ix,iy,seed)*(1-fx)+mix(ix+1,iy,seed)*fx)*(1-fy)+(mix(ix,iy+1,seed)*(1-fx)+mix(ix+1,iy+1,seed)*fx)*fy;}
export function rng(g:Realm){g.rng=(g.rng+0x6d2b79f5)|0;let t=g.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
export function notice(g:Realm,text:string,kind:GameEvent['kind']='world'){g.events.unshift({time:g.time,text,kind});g.events.length=Math.min(g.events.length,100);}
function around(i:number){const x=i%MAP_SIZE,y=Math.floor(i/MAP_SIZE);const n:number[]=[];if(x>0)n.push(i-1);if(x<MAP_SIZE-1)n.push(i+1);if(y>0)n.push(i-MAP_SIZE);if(y<MAP_SIZE-1)n.push(i+MAP_SIZE);return n;}
export function passable(g:Realm,i:number){const t=g.cells[i];return !!t&&(t.ground==='grass'||t.ground==='sand')&&!g.blocked.has(i);}
function door(b:Building){return indexOf(b.x+Math.floor(CATALOG[b.kind].width/2),b.y+CATALOG[b.kind].height);}
function markBuilding(g:Realm,b:Building){const d=CATALOG[b.kind];for(let y=b.y;y<b.y+d.height;y++)for(let x=b.x;x<b.x+d.width;x++)g.blocked.add(indexOf(x,y));}
export function buildingsOf(g:Realm,city:number,kind?:BuildingKind){return g.buildings.filter(b=>b.city===city&&(!kind||b.kind===kind));}
export function workersOf(g:Realm,city:number){return g.workers.filter(w=>w.city===city);}
export function activeLevel(b:Building){return b.complete?b.level:Math.max(0,b.level-1);}
export function housing(g:Realm,city:number){return 12+buildingsOf(g,city,'house').reduce((n,b)=>n+activeLevel(b)*6,0);}
export function storage(g:Realm,city:number){return 500+buildingsOf(g,city,'store').reduce((n,b)=>n+activeLevel(b)*500,0);}
export function canAfford(c:City,cost:Partial<Stock>){return RESOURCES.every(r=>c.stock[r]>=(cost[r]||0));}
function pay(c:City,cost:Partial<Stock>){for(const r of RESOURCES)c.stock[r]-=cost[r]||0;}
export function createRealm(seed='wildflower',rivals=16):Realm{
  const safe=seed.trim().slice(0,48)||'wildflower',h=hashText(safe);
  const g:Realm={version:2,seed:safe,time:0,rng:h,nextId:1,cells:[],cities:[],buildings:[],workers:[],armies:[],events:[],blocked:new Set(),original:[],soldiers:[],effects:[]};
  for(let y=0;y<MAP_SIZE;y++)for(let x=0;x<MAP_SIZE;x++){
    const n=noise(x,y,12,h),v=mix(x,y,h),height=noise(x,y,28,h+17);
    const river=163+Math.sin(y*.032+h%8)*13+Math.sin(y*.087)*5;
    let ground:Ground='grass';
    if(Math.abs(x-river)<1.8||(height<.17&&noise(x,y,7,h)>.28))ground='water';
    else if(Math.abs(x-river)<3)ground='sand';
    else if(height>.74&&v>.27)ground=v>.89?'iron':'stone';
    else if(n>.48&&v>.22)ground='forest';
    else if(v>.992)ground='stone';else if(v>.989)ground='iron';
    g.cells.push({ground,amount:ground==='forest'?96:ground==='stone'?260:ground==='iron'?200:0,variation:v,traffic:0});
  }
  const spots=[{x:118,y:124}];
  const candidates:{x:number;y:number}[]=[];
  for(let yy=22;yy<240;yy+=40)for(let xx=22;xx<240;xx+=40){const x=xx+Math.floor(rng(g)*10)-5,y=yy+Math.floor(rng(g)*10)-5;if(Math.hypot(x-118,y-124)>30)candidates.push({x,y});}
  // Shuffle without changing the player's dependable starting location.
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  spots.push(...candidates.slice(0,Math.max(4,Math.min(35,Math.floor(rivals)))));
  for(let id=0;id<spots.length;id++){
    const {x,y}=spots[id];
    for(let dy=-14;dy<=14;dy++)for(let dx=-14;dx<=14;dx++){
      const t=g.cells[indexOf(x+dx,y+dy)];if(!t)continue;
      if(Math.hypot(dx,dy)<8||Math.abs(dx)<2||Math.abs(dy)<2){t.ground='grass';t.amount=0;if(Math.abs(dx)<1&&Math.abs(dy)<8)t.traffic=14;}
    }
    // Every city gets reachable supplies. Gathering still removes finite loads.
    for(let k=0;k<11;k++)for(let j=0;j<3;j++){const t=g.cells[indexOf(x-11+k,y-10+j)];t.ground='forest';t.amount=96;}
    for(let j=0;j<3;j++)for(let k=0;k<3;k++){let t=g.cells[indexOf(x+9+k,y-4+j)];t.ground='stone';t.amount=260;t=g.cells[indexOf(x+9+k,y+5+j)];t.ground='iron';t.amount=200;}
    const city:City={id,name:id===0?'Willowmere':CITY_NAMES[id%CITY_NAMES.length],ruler:id===0?'You':NAMES[id%NAMES.length],color:COLORS[id%COLORS.length],x,y,stock:{wood:id===0?230:190,stone:150,iron:95,food:180},delivered:zeroStock(),troops:id===0?8:5+Math.floor(rng(g)*5),relation:0,personality: (['Builder','Merchant','Warlord'] as const)[id%3],training:[],nextDecision:8+id%9,nextRaid:80+id*7,fallen:false};g.cities.push(city);
    const starts:[BuildingKind,number,number][]=[['hall',-1,-2],['house',-5,2],['house',3,2],['farm',-6,-4],['store',3,-3],['barracks',-1,5]];
    for(const [kind,dx,dy]of starts){const b:Building={id:g.nextId++,city:id,kind,x:x+dx,y:y+dy,level:1,progress:1,complete:true};g.buildings.push(b);markBuilding(g,b);}
    for(let n=0;n<10;n++)spawnWorker(g,id,JOBS[n%JOBS.length]);
    if(id===0){const p=workersOf(g,0);p.forEach((w,i)=>w.job=i<4?'wood':i<7?'food':i===7?'stone':i===8?'iron':'builder');}
  }
  // A narrow trade-road network and river causeways keep the realm connected.
  for(let id=1;id<g.cities.length;id++){
    const c=g.cities[id],near=g.cities.slice(0,id).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];
    let x=c.x,y=c.y+9;const carve=()=>{const t=g.cells[indexOf(x,y)];t.ground='grass';t.amount=0;t.traffic=14;};
    while(x!==near.x){carve();x+=Math.sign(near.x-x);}while(y!==near.y+9){carve();y+=Math.sign(near.y+9-y);}carve();
  }
  g.original=g.cells.map(t=>t.ground);
  notice(g,`You founded Willowmere. ${g.cities.length-1} AI governors are building their own futures.`);
  return g;
}
function spawnWorker(g:Realm,city:number,job:Job='wood'){
  const c=g.cities[city],hall=buildingsOf(g,city,'hall')[0],p=coords(door(hall));
  const id=g.nextId++;g.workers.push({id,city,name:NAMES[(id+city)%NAMES.length],x:p.x+.5,y:p.y+.5,job,state:'idle',path:[],pathAt:0,target:-1,targetBuilding:-1,clock:id%7*.1,cargo:0,cargoType:'wood'});
  return c;
}
/** Local breadth-first search finds the closest reachable work site, not a straight-line shortcut. */
function search(g:Realm,start:number,accept:(i:number)=>boolean,maxNodes=2400):number[]|null{
  const queue=[start],parents=new Map<number,number>([[start,-1]]);let at=0,end=-1;
  while(at<queue.length&&at<maxNodes){const i=queue[at++];if(accept(i)){end=i;break;}for(const n of around(i))if(!parents.has(n)&&passable(g,n)){parents.set(n,i);queue.push(n);}}
  if(end<0)return null;const path:number[]=[];for(let n=end;parents.get(n)!>=0;n=parents.get(n)!)path.push(n);path.reverse();return path;
}
export function pathTo(g:Realm,from:number,to:number,maxNodes=65536){return search(g,from,i=>i===to,maxNodes);}
function walk(w:Worker,path:number[],state:Worker['state']){w.path=path;w.pathAt=0;w.state=state;w.clock=0;}
function nearestDrop(g:Realm,w:Worker){const eligible=g.buildings.filter(b=>b.city===w.city&&activeLevel(b)>0&&(['hall','store'].includes(b.kind)||(w.job==='wood'&&b.kind==='lumber')||(w.job==='stone'&&b.kind==='quarry')||(w.job==='iron'&&b.kind==='mine')));const doors=new Set(eligible.map(door));return search(g,indexOf(Math.floor(w.x),Math.floor(w.y)),i=>doors.has(i),2800);}
function startWork(g:Realm,w:Worker){
  const start=indexOf(Math.floor(w.x),Math.floor(w.y));
  if(w.cargo>0){const path=nearestDrop(g,w);if(path)walk(w,path,'returning');else w.clock=3;return;}
  if(w.job==='builder'){
    const sites=g.buildings.filter(b=>b.city===w.city&&!b.complete).sort((a,b)=>a.id-b.id);
    for(const b of sites){const path=pathTo(g,start,door(b),2400);if(path){w.targetBuilding=b.id;walk(w,path,'walking');return;}}
    w.clock=1.5;return;
  }
  if(w.job==='food'){
    const farms=buildingsOf(g,w.city,'farm').filter(b=>activeLevel(b)>0);const ds=new Map(farms.map(b=>[door(b),b.id]));const path=search(g,start,i=>ds.has(i));
    if(path){w.targetBuilding=ds.get(path.at(-1)??start)!;w.target=-1;walk(w,path,'walking');}else w.clock=2;return;
  }
  const kind=w.job==='wood'?'forest':w.job;
  let resource=-1;
  const city=g.cities[w.city];
  const path=search(g,start,i=>{const p=coords(i);if(Math.hypot(p.x-city.x,p.y-city.y)>24)return false;const target=around(i).find(n=>g.cells[n].ground===kind&&g.cells[n].amount>0);if(target===undefined)return false;resource=target;return true;},3000);
  if(path){w.target=resource;w.targetBuilding=-1;walk(w,path,'walking');}else w.clock=2;
}
function move(entity:{x:number;y:number;path:number[];pathAt:number},distance:number,g?:Realm){
  while(distance>0&&entity.pathAt<entity.path.length){const p=coords(entity.path[entity.pathAt]),dx=p.x+.5-entity.x,dy=p.y+.5-entity.y,d=Math.hypot(dx,dy);if(d<=distance+.001){entity.x=p.x+.5;entity.y=p.y+.5;distance-=d;entity.pathAt++;if(g)g.cells[indexOf(p.x,p.y)].traffic=Math.min(30,g.cells[indexOf(p.x,p.y)].traffic+.035);}else{entity.x+=dx/d*distance;entity.y+=dy/d*distance;distance=0;}}
  return entity.pathAt>=entity.path.length;
}
function tickWorker(g:Realm,w:Worker,dt:number){
  if(w.state==='walking'||w.state==='returning'){
    if(w.path.slice(w.pathAt).some(i=>!passable(g,i))){w.state='idle';w.path=[];w.clock=0;return;}
    if(!move(w,dt*2.3,g))return;
    if(w.state==='returning'){
      const c=g.cities[w.city],room=storage(g,w.city);c.stock[w.cargoType]=Math.min(room,c.stock[w.cargoType]+w.cargo);c.delivered[w.cargoType]+=w.cargo;w.cargo=0;w.state='idle';w.clock=.35;
    }else{w.state=w.job==='builder'?'building':'gathering';w.clock=0;}
    return;
  }
  if(w.state==='idle'){w.clock-=dt;if(w.clock<=0)startWork(g,w);return;}
  if(w.state==='building'){
    const b=g.buildings.find(b=>b.id===w.targetBuilding);if(!b||b.complete){w.state='idle';return;}
    b.progress=Math.min(1,b.progress+dt/CATALOG[b.kind].seconds);
    if(b.progress>=1){b.complete=true;if((g.humanCities||[0]).includes(b.city))notice(g,`${g.cities[b.city].name} completed ${CATALOG[b.kind].name}.`,'build');w.state='idle';}
    return;
  }
  const boostKind=w.job==='wood'?'lumber':w.job==='stone'?'quarry':w.job==='iron'?'mine':null;
  const farm=w.job==='food'?g.buildings.find(b=>b.id===w.targetBuilding):null;
  const boost=1+(boostKind?buildingsOf(g,w.city,boostKind).reduce((n,b)=>n+activeLevel(b)*.35,0):0)+(activeLevel(buildingsOf(g,w.city,'hall')[0])-1)*.12+(farm?Math.max(0,activeLevel(farm)-1)*.25:0);
  w.clock+=dt*boost;
  if(w.clock<3.4)return;
  if(w.job==='food'){w.cargo=8;w.cargoType='food';}
  else{const t=g.cells[w.target];if(!t||t.amount<=0){w.state='idle';return;}w.cargo=Math.min(8,t.amount);w.cargoType=w.job as Resource;t.amount-=w.cargo;if(t.amount<=0){t.ground='grass';t.amount=0;}}
  w.state='idle';w.clock=0;
}
export function placementError(g:Realm,city:number,kind:BuildingKind,x:number,y:number){
  if(!Number.isInteger(x)||!Number.isInteger(y))return 'Choose a tile on the map.';
  const c=g.cities[city],d=CATALOG[kind];if(!c||c.fallen)return 'This village cannot build.';
  if(Math.hypot(x-c.x,y-c.y)>15)return 'Build within your village boundary.';
  for(let yy=y-1;yy<=y+d.height;yy++)for(let xx=x-1;xx<=x+d.width;xx++){
    if(xx<1||yy<1||xx>=MAP_SIZE-1||yy>=MAP_SIZE-1)return 'That is outside the world.';
    const i=indexOf(xx,yy);if(g.blocked.has(i))return 'Leave one tile of space around buildings.';
    if(xx>=x&&xx<x+d.width&&yy>=y&&yy<y+d.height&&!['grass','sand'].includes(g.cells[i].ground))return 'Choose clear ground. Workers can clear trees by harvesting them.';
  }
  if(!passable(g,indexOf(x+Math.floor(d.width/2),y+d.height)))return 'The entrance needs a clear path.';
  return '';
}
export function placeBuilding(g:Realm,city:number,kind:BuildingKind,x:number,y:number):string{
  if(kind==='hall')return 'Upgrade your existing village hall.';
  const error=placementError(g,city,kind,x,y);if(error)return error;
  if(!canAfford(g.cities[city],CATALOG[kind].cost))return 'Not enough resources. Let your workers make a few deliveries.';
  pay(g.cities[city],CATALOG[kind].cost);const b:Building={id:g.nextId++,city,kind,x,y,level:1,progress:0,complete:false};g.buildings.push(b);markBuilding(g,b);
  if((g.humanCities||[0]).includes(city)){notice(g,`${g.cities[city].name} started construction: ${CATALOG[kind].name}.`,'build');if(!workersOf(g,city).some(w=>w.job==='builder'))setJobCount(g,city,'builder',1);}
  return '';
}
export function upgradeCost(b:Building):Partial<Stock>{return {wood:Math.floor((CATALOG[b.kind].cost.wood||40)*b.level*1.4),stone:Math.floor((CATALOG[b.kind].cost.stone||20)*b.level*1.4),iron:Math.floor((CATALOG[b.kind].cost.iron||10)*b.level)};}
export function upgradeBuilding(g:Realm,id:number,owner=0){const b=g.buildings.find(b=>b.id===id);if(!b||b.city!==owner)return 'Choose one of your buildings.';if(!b.complete)return 'Construction is still in progress.';if(b.level>=5)return 'This building is at its maximum level.';const cost=upgradeCost(b);if(!canAfford(g.cities[owner],cost))return 'Not enough resources for this upgrade.';pay(g.cities[owner],cost);b.level++;b.complete=false;b.progress=0;if(!workersOf(g,owner).some(w=>w.job==='builder'))setJobCount(g,owner,'builder',1);notice(g,`Upgrading ${CATALOG[b.kind].name} to level ${b.level}.`,'build');return '';}
export function assignWorker(g:Realm,id:number,job:Job,owner=0){const w=g.workers.find(w=>w.id===id);if(!w||w.city!==owner||!JOBS.includes(job))return false;w.job=job;if(w.cargo<=0){w.state='idle';w.path=[];w.clock=0;}return true;}
export function orderHarvest(g:Realm,id:number,target:number,owner=0){
  const w=g.workers.find(w=>w.id===id&&w.city===owner),node=g.cells[target];
  if(!w||!node||!['forest','stone','iron'].includes(node.ground)||node.amount<=0)return 'Choose a tree, stone deposit, or iron deposit.';
  const p=coords(target),c=g.cities[owner];if(Math.hypot(p.x-c.x,p.y-c.y)>24)return 'That deposit is too far from your village.';
  if(w.cargo>0)return 'This worker must deliver their current load first.';
  const start=indexOf(Math.floor(w.x),Math.floor(w.y)),paths=around(target).filter(i=>passable(g,i)).map(i=>pathTo(g,start,i,3000)).filter((p):p is number[]=>p!==null).sort((a,b)=>a.length-b.length);
  if(!paths[0])return 'There is no clear path to that deposit.';
  w.job=node.ground==='forest'?'wood':node.ground as Job;w.target=target;w.targetBuilding=-1;walk(w,paths[0],'walking');return '';
}
export function setJobCount(g:Realm,city:number,job:Job,count:number){
  const ws=workersOf(g,city),current=ws.filter(w=>w.job===job);count=Math.max(0,Math.min(ws.length,Math.floor(count)));
  if(current.length<count){const other=ws.filter(w=>w.job!==job).sort((a,b)=>Number(a.job==='builder')-Number(b.job==='builder'));for(const w of other.slice(0,count-current.length)){w.job=job;if(w.cargo===0){w.state='idle';w.path=[];w.clock=0;}}}
  else if(current.length>count){const fallback:Job=job==='wood'?'food':'wood';for(const w of current.slice(count)){w.job=fallback;if(w.cargo===0){w.state='idle';w.path=[];w.clock=0;}}}
}
export function recruit(g:Realm,city:number,kind:RecruitKind){
  const c=g.cities[city];if(c.fallen)return 'The village has fallen.';
  if(c.training.length>=5)return 'The training queue is full (5).';
  if(kind==='worker'&&workersOf(g,city).length+c.training.filter(t=>t.kind==='worker').length>=housing(g,city))return 'Build or upgrade cottages for more housing.';
  if(kind!=='worker'){if(!Object.hasOwn(UNITS,kind))return 'Unknown recruit type.';const locked=unlockError(g,city,kind);if(locked)return locked;}
  const cost=kind==='worker'?{food:35}:UNITS[kind].cost;if(!canAfford(c,cost))return 'Not enough resources to recruit.';
  const level=kind==='worker'?activeLevel(buildingsOf(g,city,'hall')[0]):Math.max(...buildingsOf(g,city,'barracks').map(activeLevel));
  pay(c,cost);c.training.push({kind,left:(kind==='worker'?10:UNITS[kind].seconds)/(1+Math.max(0,level-1)*.2)});return '';
}
export function sendRaid(g:Realm,city:number,target:number,count:number){
  const from=g.cities[city],to=g.cities[target];count=Math.floor(count);
  if(!from||!to||city===target||to.fallen)return 'Choose another active village.';
  if(!Number.isFinite(count)||count<1||count>from.troops)return 'Choose a valid number of available spearmen.';
  if(g.armies.some(a=>a.city===city))return 'Your raiding party is already on a mission.';
  const a=door(buildingsOf(g,city,'hall')[0]),b=door(buildingsOf(g,target,'hall')[0]);const path=pathTo(g,a,b);if(!path)return 'No land route reaches this village.';
  from.troops-=count;const p=coords(a);g.armies.push({id:g.nextId++,city,target,x:p.x+.5,y:p.y+.5,troops:count,path,pathAt:0,returning:false,cargo:zeroStock()});
  if(city===0||target===0)notice(g,`${from.name} sends ${count} spearmen toward ${to.name}.`,'battle');return '';
}
function resolveRaid(g:Realm,a:Army){
  const defender=g.cities[a.target],towers=buildingsOf(g,defender.id,'watchtower').reduce((n,b)=>n+activeLevel(b),0);
  const power=a.troops,defense=defender.troops*(1+.3*towers)+2;
  const won=power>defense;
  const lost=Math.min(a.troops,Math.max(1,Math.ceil(defense*(won?.35:.72))));a.troops-=lost;
  defender.troops=Math.max(0,defender.troops-Math.ceil(power*(won?.65:.3)));
  if(a.city===0)defender.relation=Math.max(-100,defender.relation-30);
  if(a.target===0)g.cities[a.city].relation=Math.max(-100,g.cities[a.city].relation-30);
  if(won){let capacity=a.troops*12;for(const r of ['wood','food','stone','iron'] as Resource[]){const amount=Math.min(Math.floor(defender.stock[r]*.28),Math.ceil(capacity/(r==='wood'?2:3)));a.cargo[r]=amount;defender.stock[r]-=amount;capacity-=amount;}}
  if(a.city===0||a.target===0)notice(g,`${g.cities[a.city].name} ${won?'wins the raid on':'is repelled by'} ${defender.name}. ${lost} attackers lost${won?`; ${RESOURCES.reduce((n,r)=>n+a.cargo[r],0)} resources carried home`:''}.`,'battle');
  if(a.troops<=0){a.path=[];a.pathAt=0;a.returning=true;return;}
  a.returning=true;const p=coords(door(buildingsOf(g,a.city,'hall')[0]));a.path=pathTo(g,indexOf(Math.floor(a.x),Math.floor(a.y)),indexOf(p.x,p.y))||[];a.pathAt=0;
}
export function gift(g:Realm,target:number,owner=0){const c=g.cities[target];if(!c||target===owner)return 'Select a rival village.';if(g.cities[owner].stock.food<50)return 'A goodwill gift costs 50 food.';g.cities[owner].stock.food-=50;c.stock.food=Math.min(storage(g,c.id),c.stock.food+50);c.relation=Math.min(100,c.relation+25);notice(g,`A gift of food reaches ${c.name}. Relations improve to ${c.relation}.`,'diplomacy');return '';}
function ai(g:Realm,c:City){
  if(c.fallen)return;
  if(g.time>=c.nextDecision){c.nextDecision=g.time+8+rng(g)*7;
    const workers=workersOf(g,c.id),houses=housing(g,c.id);
    if(c.stock.food<60&&workers.filter(w=>w.job==='food').length<Math.ceil(workers.length*.45))setJobCount(g,c.id,'food',Math.ceil(workers.length*.45));
    if(workers.length<Math.min(houses,c.personality==='Builder'?24:18))recruit(g,c.id,'worker');
    else if(c.troops<22)recruit(g,c.id,'spear');
    if(!buildingsOf(g,c.id).some(b=>!b.complete)){
      const priorities:BuildingKind[]=workers.length>=houses-1?['house']:c.personality==='Warlord'?['watchtower','lumber','quarry','mine','store','house']:['lumber','quarry','mine','store','house','watchtower'];
      const kind=priorities.find(k=>buildingsOf(g,c.id,k).length<(k==='house'?4:1));
      if(kind&&canAfford(c,CATALOG[kind].cost))for(let attempt=0;attempt<32;attempt++){const x=c.x+Math.floor(rng(g)*24)-12,y=c.y+Math.floor(rng(g)*24)-12;if(!placementError(g,c.id,kind,x,y)){placeBuilding(g,c.id,kind,x,y);break;}}
    }
  }
  if(g.time>=c.nextRaid){c.nextRaid=g.time+70+rng(g)*70;if(c.troops>=10&&!g.armies.some(a=>a.city===c.id)){
    const candidates=g.cities.filter(t=>t.id!==c.id&&!t.fallen&&!g.disabledCities?.includes(t.id)&&!(g.humanCities||[]).includes(t.id)&&(t.id!==0||g.time>300&&(c.relation<0||c.personality==='Warlord'&&c.relation<25))&&Math.hypot(t.x-c.x,t.y-c.y)<100&&t.troops<c.troops*.72).sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y));
    if(candidates[0])sendRaid(g,c.id,candidates[0].id,Math.floor(c.troops*.75));
  }}
}
export function tick(g:Realm,dt=.1){
  dt=Math.max(0,Math.min(.25,dt));g.time+=dt;
  for(const w of g.workers)if(!g.disabledCities?.includes(w.city))tickWorker(g,w,dt);
  for(const c of g.cities){
    if(g.disabledCities?.includes(c.id))continue;
    c.stock.food=Math.max(0,c.stock.food-dt*workersOf(g,c.id).length*.035);
    const first=c.training[0];if(first){first.left-=dt;if(first.left<=0){if(first.kind==='worker')spawnWorker(g,c.id,c.stock.food<80?'food':'wood');else if(first.kind==='spear')c.troops++;else{c.military??={archer:0,cavalry:0};c.military[first.kind]++;}c.training.shift();if((g.humanCities||[0]).includes(c.id))notice(g,first.kind==='worker'?`A new villager joins ${c.name}.`:`${c.name} trained a ${UNITS[first.kind].name.toLowerCase()}.`,'world');}}
    if(c.id>0&&!g.humanCities?.includes(c.id))ai(g,c);
  }
  for(const a of [...g.armies])if(move(a,dt*2.5)){
    if(!a.returning)resolveRaid(g,a);else{const c=g.cities[a.city];c.troops+=a.troops;for(const r of RESOURCES)c.stock[r]=Math.min(storage(g,c.id),c.stock[r]+a.cargo[r]);g.armies=g.armies.filter(x=>x.id!==a.id);if(a.city===0)notice(g,`Your raiding party returned with ${a.troops} spearmen and its spoils.`,'battle');}
  }
  tickMilitary(g,dt);
}
export function saveRealm(g:Realm){
  const changed=g.cells.flatMap((c,i)=>c.amount!==initialAmount(g.original[i])||c.ground!==g.original[i]||c.traffic>0?[[i,c.ground,c.amount,c.traffic]]:[]);
  return JSON.stringify({version:2,seed:g.seed,rivals:g.cities.length-1,time:g.time,rng:g.rng,nextId:g.nextId,cities:g.cities,buildings:g.buildings,workers:g.workers,armies:g.armies,events:g.events,soldiers:g.soldiers||[],humanCities:g.humanCities,disabledCities:g.disabledCities,changed});
}
function initialAmount(t:Ground){return t==='forest'?96:t==='stone'?260:t==='iron'?200:0;}
function finite(n:unknown,min=0,max=10000000):n is number{return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;}
export function loadRealm(raw:string):Realm{
  if(raw.length>3000000)throw Error('The world file is too large (maximum 3 MB).');
  const d=JSON.parse(raw);if(d.version!==2||typeof d.seed!=='string'||d.seed.length>48||!Number.isInteger(d.rivals)||d.rivals<4||d.rivals>35||!finite(d.time)||!finite(d.rng,-2147483648,4294967295)||!finite(d.nextId,1,1000000))throw Error('This is not a valid settlement world.');
  const g=createRealm(d.seed,d.rivals);
  const validPoint=(x:unknown,y:unknown)=>finite(x,0,MAP_SIZE-1)&&finite(y,0,MAP_SIZE-1);
  const validCity=(n:unknown)=>Number.isInteger(n)&&finite(n,0,g.cities.length-1);
  const validPath=(p:unknown)=>Array.isArray(p)&&p.length<=65536&&p.every(i=>Number.isInteger(i)&&finite(i,0,MAP_SIZE*MAP_SIZE-1));
  const validStock=(s:Stock)=>!!s&&RESOURCES.every(r=>finite(s[r],0,1000000000000));
  for(const key of ['humanCities','disabledCities'])if(d[key]!==undefined&&(!Array.isArray(d[key])||d[key].length>5||!d[key].every(validCity)||new Set(d[key]).size!==d[key].length))throw Error('Invalid player slots.');
  if(!Array.isArray(d.cities)||d.cities.length!==g.cities.length||!d.cities.every((c:City,i:number)=>c.id===i&&c.name===g.cities[i].name&&c.color===g.cities[i].color&&(d.humanCities?.includes(i)?typeof c.ruler==='string'&&/^[\p{L}\p{N} _-]{2,20}$/u.test(c.ruler):c.ruler===g.cities[i].ruler)&&c.x===g.cities[i].x&&c.y===g.cities[i].y&&validStock(c.stock)&&validStock(c.delivered)&&finite(c.troops,0,10000)&&finite(c.relation,-100,100)&&['Merchant','Builder','Warlord'].includes(c.personality)&&typeof c.fallen==='boolean'&&finite(c.nextDecision)&&finite(c.nextRaid)&&Array.isArray(c.training)&&c.training.length<=5&&c.training.every(t=>['worker','spear','archer','cavalry'].includes(t.kind)&&finite(t.left,0,30))&&(!c.military||finite(c.military.archer,0,10000)&&finite(c.military.cavalry,0,10000))&&(!c.technology||finite(c.technology.weapons,0,3)&&Number.isInteger(c.technology.weapons)&&finite(c.technology.armor,0,3)&&Number.isInteger(c.technology.armor)&&(!c.technology.queue||['weapons','armor'].includes(c.technology.queue.kind)&&finite(c.technology.queue.level,1,3)&&finite(c.technology.queue.left,0,105)))&&['health','lastDamage','recoverUntil','protectedUntil'].every(k=>(c as any)[k]===undefined||finite((c as any)[k]))))throw Error('The world has invalid city data.');
  if(!Array.isArray(d.buildings)||d.buildings.length>3000||!d.buildings.every((b:Building)=>finite(b.id,1,1000000)&&validCity(b.city)&&Object.hasOwn(CATALOG,b.kind)&&validPoint(b.x,b.y)&&Number.isInteger(b.x)&&Number.isInteger(b.y)&&b.x+CATALOG[b.kind].width<MAP_SIZE&&b.y+CATALOG[b.kind].height<MAP_SIZE&&finite(b.level,1,5)&&finite(b.progress,0,1)&&typeof b.complete==='boolean'))throw Error('The world has invalid buildings.');
  if(!g.cities.every(c=>d.buildings.some((b:Building)=>b.city===c.id&&b.kind==='hall')))throw Error('A village is missing its hall.');
  if(!Array.isArray(d.workers)||d.workers.length>1500||!d.workers.every((w:Worker)=>finite(w.id,1,1000000)&&validCity(w.city)&&typeof w.name==='string'&&w.name.length<24&&validPoint(w.x,w.y)&&JOBS.includes(w.job)&&['idle','walking','gathering','returning','building'].includes(w.state)&&validPath(w.path)&&finite(w.pathAt,0,w.path.length)&&finite(w.target,-1,MAP_SIZE*MAP_SIZE-1)&&finite(w.targetBuilding,-1,1000000)&&finite(w.clock,-10,1000)&&finite(w.cargo,0,8)&&RESOURCES.includes(w.cargoType)))throw Error('The world has invalid villagers.');
  if(!Array.isArray(d.armies)||d.armies.length>100||!d.armies.every((a:Army)=>finite(a.id,1,1000000)&&validCity(a.city)&&validCity(a.target)&&a.city!==a.target&&validPoint(a.x,a.y)&&finite(a.troops,0,10000)&&validPath(a.path)&&finite(a.pathAt,0,a.path.length)&&typeof a.returning==='boolean'&&validStock(a.cargo)))throw Error('The world has invalid armies.');
  if(!Array.isArray(d.changed)||d.changed.length>MAP_SIZE*MAP_SIZE||!d.changed.every((c:unknown[])=>Array.isArray(c)&&c.length===4&&Number.isInteger(c[0])&&finite(c[0],0,MAP_SIZE*MAP_SIZE-1)&&['grass','sand','water','forest','stone','iron'].includes(c[1] as string)&&finite(c[2],0,260)&&finite(c[3],0,30)))throw Error('The world has invalid terrain.');
  if(!Array.isArray(d.events)||d.events.length>100||!d.events.every((e:GameEvent)=>finite(e.time)&&typeof e.text==='string'&&e.text.length<500&&['world','build','delivery','battle','diplomacy'].includes(e.kind)))throw Error('The world has invalid history.');
  if(!validMilitary(d,g.cities.length))throw Error('The world has invalid soldiers.');
  const ids=[...d.buildings,...d.workers,...d.armies,...(d.soldiers||[])].map((a:{id:number})=>a.id);if(new Set(ids).size!==ids.length||Math.max(...ids)>=d.nextId)throw Error('The world has invalid entity identifiers.');
  Object.assign(g,{time:d.time,rng:d.rng,nextId:d.nextId,cities:d.cities,buildings:d.buildings,workers:d.workers,armies:d.armies,events:d.events,soldiers:d.soldiers||[],humanCities:d.humanCities,disabledCities:d.disabledCities});g.blocked.clear();for(const b of g.buildings)markBuilding(g,b);
  for(const [i,ground,amount,traffic]of d.changed)Object.assign(g.cells[i],{ground,amount,traffic});
  return g;
}
