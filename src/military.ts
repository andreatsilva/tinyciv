import {MAP_SIZE,indexOf,coords,pathTo,passable,buildingsOf,activeLevel,canAfford,notice,zeroStock,storage,type Realm,type Stock,type City} from './settlement.ts';
export type UnitKind='spear'|'archer'|'cavalry';
export type RecruitKind='worker'|UnitKind;
export interface Technology {weapons:number;armor:number;queue?:{kind:'weapons'|'armor';left:number;level:number}}
export interface Soldier {id:number;city:number;kind:UnitKind;x:number;y:number;hp:number;state:'idle'|'move'|'attack'|'hold'|'return';path:number[];pathAt:number;targetUnit:number;targetCity:number;cooldown:number;repath:number;loot:Stock}
export interface Shot {id:number;x:number;y:number;tx:number;ty:number;until:number;city:number}
export const UNITS:Record<UnitKind,{name:string;hp:number;damage:number;range:number;speed:number;seconds:number;hall:number;barracks:number;cost:Partial<Stock>}>= {
  spear:{name:'Spearman',hp:80,damage:10,range:1.5,speed:2.3,seconds:14,hall:1,barracks:1,cost:{wood:20,iron:12,food:20}},
  archer:{name:'Archer',hp:58,damage:8,range:5,speed:2.2,seconds:18,hall:2,barracks:2,cost:{wood:35,iron:8,food:25}},
  cavalry:{name:'Cavalry',hp:130,damage:17,range:1.7,speed:3.5,seconds:26,hall:3,barracks:3,cost:{wood:25,iron:45,food:60}}
};
export function reserve(c:City,kind:UnitKind){return kind==='spear'?c.troops:c.military?.[kind]||0;}
export function unitHP(g:Realm,city:number,kind:UnitKind){return UNITS[kind].hp*(1+(g.cities[city].technology?.armor||0)*.15);}
export function unlockError(g:Realm,city:number,kind:UnitKind){const d=UNITS[kind],hall=activeLevel(buildingsOf(g,city,'hall')[0]),barracks=Math.max(0,...buildingsOf(g,city,'barracks').map(activeLevel));return hall<d.hall||barracks<d.barracks?`${d.name} requires village hall ${d.hall} and barracks ${d.barracks}.`:'';}
export function deploy(g:Realm,city:number,kind:UnitKind,count:number):string{
  if(!Object.hasOwn(UNITS,kind)||!Number.isInteger(count)||count<1||count>40)return 'Deploy between 1 and 40 available units.';
  if(!g.cities[city]||count>reserve(g.cities[city],kind))return 'Not enough trained units in reserve.';
  g.soldiers??=[];
  if(g.soldiers.filter(s=>s.city===city).length+count>80||g.soldiers.length+count>400)return 'Field army limit reached (80 per player).';
  const c=g.cities[city],hall=buildingsOf(g,city,'hall')[0];const spots:number[]=[];
  for(let radius=0;radius<=7;radius++)for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
    const x=c.x+dx,y=hall.y+3+dy;if(x<0||y<0||x>=MAP_SIZE||y>=MAP_SIZE)continue;const i=indexOf(x,y);if(passable(g,i))spots.push(i);
  }
  if(!spots.length)return 'Your village entrance is blocked.';
  if(kind==='spear')c.troops-=count;else{c.military??={archer:0,cavalry:0};c.military[kind]-=count;}
  for(let n=0;n<count;n++){const p=coords(spots[n%spots.length]);g.soldiers.push({id:g.nextId++,city,kind,x:p.x+.5+(n%2)*.15,y:p.y+.5,hp:unitHP(g,city,kind),state:'idle',path:[],pathAt:0,targetUnit:-1,targetCity:-1,cooldown:n*.07,repath:0,loot:zeroStock()});}
  notice(g,`${c.ruler} deployed ${count} ${UNITS[kind].name.toLowerCase()}${count===1?'':'s'} from ${c.name}.`,'battle');return '';
}
function validUnits(g:Realm,owner:number,ids:number[]){if(!Array.isArray(ids)||ids.length<1||ids.length>80||new Set(ids).size!==ids.length)return null;const units=ids.map(id=>g.soldiers?.find(s=>s.id===id&&s.city===owner));return units.every(Boolean)?units as Soldier[]:null;}
function route(g:Realm,u:Soldier,x:number,y:number,max=65536){const i=indexOf(Math.floor(u.x),Math.floor(u.y)),target=indexOf(Math.floor(x),Math.floor(y));const p=pathTo(g,i,target,max);if(p===null)return false;u.path=p;u.pathAt=0;return true;}
function nearGround(g:Realm,x:number,y:number){for(let r=0;r<6;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const xx=Math.floor(x)+dx,yy=Math.floor(y)+dy;if(xx>=0&&yy>=0&&xx<MAP_SIZE&&yy<MAP_SIZE&&passable(g,indexOf(xx,yy)))return {x:xx,y:yy};}return null;}
export function commandUnits(g:Realm,owner:number,ids:number[],order:'move'|'attack'|'hold'|'return',x?:number,y?:number,targetUnit=-1,targetCity=-1):string{
  const units=validUnits(g,owner,ids);if(!units)return 'You can command only your own selected soldiers.';
  if(!['move','attack','hold','return'].includes(order))return 'Unknown troop order.';
  if(!Number.isInteger(targetUnit)||!Number.isInteger(targetCity)||[x,y].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0||v>=MAP_SIZE)))return 'Invalid target position.';
  if(order==='attack'&&targetUnit<0&&targetCity<0)return 'Choose an enemy unit or settlement.';
  if(order==='attack'){
    if(targetUnit>=0){const target=g.soldiers?.find(s=>s.id===targetUnit);if(!target||target.city===owner)return 'Choose an enemy unit.';targetCity=target.city;}
    if(targetCity>=0){const city=g.cities[targetCity];if(!city||targetCity===owner||g.disabledCities?.includes(targetCity))return 'Choose another occupied city.';if((city.protectedUntil||0)>g.time)return 'This player has new-village protection.';if((city.recoverUntil||0)>g.time)return 'This village is rebuilding after a defeat.';x=city.x;y=city.y+2;}
  }
  if(order==='return'){const c=g.cities[owner];x=c.x;y=c.y+2;}
  if(order==='move'&&(!Number.isFinite(x)||!Number.isFinite(y)||x!<0||y!<0||x!>=MAP_SIZE||y!>=MAP_SIZE))return 'Choose a point inside the world.';
  const planned:{u:Soldier;p:number[];state:Soldier['state']}[]=[];
  for(let n=0;n<units.length;n++){
    const u=units[n];if(order==='hold'){planned.push({u,p:[],state:'hold'});continue;}
    const dest=nearGround(g,(x??u.x)+(order==='attack'?0:n%5-2),(y??u.y)+(order==='attack'?0:Math.floor(n/5)));
    if(!dest)return 'No clear ground at that destination.';
    const p=pathTo(g,indexOf(Math.floor(u.x),Math.floor(u.y)),indexOf(dest.x,dest.y));if(p===null)return 'No land route to that destination.';
    planned.push({u,p,state:order==='return'?'return':order==='attack'?'attack':'move'});
  }
  for(const {u,p,state}of planned){u.path=p;u.pathAt=0;u.state=state;u.targetUnit=order==='attack'?targetUnit:-1;u.targetCity=order==='attack'?targetCity:-1;u.repath=0;}
  return '';
}
export function research(g:Realm,owner:number,kind:'weapons'|'armor'){
  if(kind!=='weapons'&&kind!=='armor')return 'Unknown research.';const c=g.cities[owner];c.technology??={weapons:0,armor:0};const t=c.technology;
  if(t.queue)return 'A research project is already in progress.';
  const level=t[kind]+1;if(level>3)return 'Maximum research level reached.';
  if(activeLevel(buildingsOf(g,owner,'hall')[0])<level+1)return `Upgrade your village hall to level ${level+1} first.`;
  const cost={wood:70*level,stone:40*level,iron:60*level};if(!canAfford(c,cost))return 'Not enough resources for research.';
  c.stock.wood-=cost.wood;c.stock.stone-=cost.stone;c.stock.iron-=cost.iron;t.queue={kind,level,left:35*level};notice(g,`${c.name} began ${kind} research ${level}.`,'build');return '';
}
function move(u:Soldier,distance:number){while(distance>0&&u.pathAt<u.path.length){const p=coords(u.path[u.pathAt]),dx=p.x+.5-u.x,dy=p.y+.5-u.y,d=Math.hypot(dx,dy);if(d<=distance+.001){u.x=p.x+.5;u.y=p.y+.5;u.pathAt++;distance-=d;}else{u.x+=dx/d*distance;u.y+=dy/d*distance;distance=0;}}return u.pathAt>=u.path.length;}
function strike(g:Realm,u:Soldier,target:Soldier){
  const damage=UNITS[u.kind].damage*(1+(g.cities[u.city].technology?.weapons||0)*.12)*(u.kind==='spear'&&target.kind==='cavalry'?1.4:1);
  target.hp-=damage;u.cooldown=u.kind==='archer'?1.25:1.1;
  if(u.kind==='archer'){g.effects??=[];g.effects.push({id:g.nextId++,x:u.x,y:u.y,tx:target.x,ty:target.y,until:g.time+.32,city:u.city});}
}
export function tickMilitary(g:Realm,dt:number){
  g.soldiers??=[];g.effects=(g.effects||[]).filter(e=>e.until>g.time);
  for(const c of g.cities){if(g.disabledCities?.includes(c.id))continue;const q=c.technology?.queue;if(q){q.left-=dt;if(q.left<=0){c.technology![q.kind]=q.level;delete c.technology!.queue;notice(g,`${c.name} completed ${q.kind} research ${q.level}.`,'build');}}
    if(c.health!==undefined&&g.time-(c.lastDamage||0)>30)c.health=Math.min(500+activeLevel(buildingsOf(g,c.id,'hall')[0])*125,c.health+dt*2);
  }
  // Garrison troops become visible defenders when an enemy approaches the hall.
  for(const c of g.cities)if(!g.disabledCities?.includes(c.id)&&c.troops>0&&g.soldiers.some(s=>s.city!==c.id&&s.targetCity===c.id&&Math.hypot(s.x-c.x,s.y-c.y)<11))deploy(g,c.id,'spear',Math.min(c.troops,12));
  if(Math.floor(g.time/1.4)!==Math.floor((g.time-dt)/1.4))for(const tower of g.buildings.filter(b=>b.kind==='watchtower'&&activeLevel(b)>0&&!g.disabledCities?.includes(b.city))){const target=g.soldiers.find(u=>u.city!==tower.city&&u.hp>0&&u.targetCity===tower.city&&Math.hypot(u.x-tower.x,u.y-tower.y)<7+activeLevel(tower));if(target){target.hp-=8*activeLevel(tower);g.effects!.push({id:g.nextId++,x:tower.x+1,y:tower.y+1,tx:target.x,ty:target.y,until:g.time+.32,city:tower.city});}}
  for(const u of [...g.soldiers]){
    if(u.hp<=0)continue;u.cooldown=Math.max(0,u.cooldown-dt);u.repath=Math.max(0,u.repath-dt);
    const d=UNITS[u.kind];let target=g.soldiers.find(t=>t.id===u.targetUnit&&t.hp>0&&t.city!==u.city);
    if(!target&&u.state!=='move'&&u.state!=='return')target=g.soldiers.filter(t=>t.city!==u.city&&t.hp>0&&Math.hypot(t.x-u.x,t.y-u.y)<=d.range+2&&((g.cities[t.city].protectedUntil||0)<=g.time)).sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y))[0];
    if(target){
      const distance=Math.hypot(target.x-u.x,target.y-u.y);
      if(distance<=d.range){if(u.cooldown<=0)strike(g,u,target);continue;}
      if(u.state!=='hold'&&u.repath<=0){const p=nearGround(g,target.x,target.y);if(p)route(g,u,p.x,p.y,4000);u.repath=1;}
    }
    if(u.state==='attack'&&u.targetCity>=0&&!target){
      const city=g.cities[u.targetCity],distance=Math.hypot(city.x-u.x,city.y+2-u.y);
      if((city.recoverUntil||0)>g.time){commandUnits(g,u.city,[u.id],'return');continue;}
      if(distance<=d.range+1){
        city.health??=500+activeLevel(buildingsOf(g,city.id,'hall')[0])*125;
        if(u.cooldown<=0){city.health-=d.damage*(1+(g.cities[u.city].technology?.weapons||0)*.12);city.lastDamage=g.time;u.cooldown=1.2;}
        if(city.health<=0){
          const attackers=g.soldiers.filter(s=>s.city===u.city&&s.targetCity===city.id&&s.hp>0);let room=attackers.length*20;
          for(const r of ['wood','food','stone','iron'] as const){const loot=Math.min(Math.floor(city.stock[r]*.3),room);city.stock[r]-=loot;room-=loot;for(let n=0;n<loot;n++)attackers[n%attackers.length].loot[r]++;}
          city.health=1;city.recoverUntil=g.time+120;notice(g,`${g.cities[u.city].ruler}'s army defeated ${city.name}. Survivors carry the spoils home.`,'battle');for(const a of attackers)commandUnits(g,a.city,[a.id],'return');
        }
        continue;
      }
    }
    if(u.pathAt<u.path.length||u.state==='return'){
      const next=u.path[u.pathAt];if(next!==undefined&&!passable(g,next)){u.path=[];u.pathAt=0;u.state='idle';continue;}
      const arrived=move(u,dt*d.speed);
      if(arrived&&u.state==='move')u.state='idle';
      if(arrived&&u.state==='return'){
        const c=g.cities[u.city];for(const r of ['wood','stone','iron','food'] as const){c.stock[r]=Math.min(storage(g,c.id),c.stock[r]+u.loot[r]);u.loot[r]=0;}
        if(u.kind==='spear')c.troops++;else{c.military??={archer:0,cavalry:0};c.military[u.kind]++;}g.soldiers=g.soldiers.filter(s=>s.id!==u.id);
      }
    }
    if(u.state==='idle'&&Math.hypot(u.x-g.cities[u.city].x,u.y-g.cities[u.city].y)<10)u.hp=Math.min(unitHP(g,u.city,u.kind),u.hp+dt*.8);
  }
  g.soldiers=g.soldiers.filter(s=>s.hp>0);
}
export function validMilitary(data:any,cityCount:number):boolean{
  if(data.soldiers===undefined)return true;if(!Array.isArray(data.soldiers)||data.soldiers.length>400)return false;
  const n=(v:any,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  return data.soldiers.every((s:any)=>n(s.id,1,1000000)&&Number.isInteger(s.id)&&Number.isInteger(s.city)&&n(s.city,0,cityCount-1)&&Object.hasOwn(UNITS,s.kind)&&n(s.x,0,MAP_SIZE)&&n(s.y,0,MAP_SIZE)&&n(s.hp,0,1000)&&['idle','move','attack','hold','return'].includes(s.state)&&Array.isArray(s.path)&&s.path.length<=65536&&s.path.every((i:any)=>Number.isInteger(i)&&n(i,0,65535))&&Number.isInteger(s.pathAt)&&n(s.pathAt,0,s.path.length)&&Number.isInteger(s.targetUnit)&&n(s.targetUnit,-1,1000000)&&Number.isInteger(s.targetCity)&&n(s.targetCity,-1,cityCount-1)&&n(s.cooldown,0,100)&&n(s.repath,0,100)&&s.loot&&['wood','stone','iron','food'].every(r=>n(s.loot[r],0,100000)));
}
