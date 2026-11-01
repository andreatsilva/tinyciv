import {CATALOG,JOBS,placeBuilding,upgradeBuilding,recruit,setJobCount,assignWorker,orderHarvest,gift,type Realm,type BuildingKind,type Job} from './settlement.ts';
import {deploy,commandUnits,research,type UnitKind,type RecruitKind} from './military.ts';
export type Order={type:string;[key:string]:unknown};
export function playerName(value:unknown){const n=typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/g,' '):'';return /^[\p{L}\p{N} _-]{2,20}$/u.test(n)?n:'';}
export function roomSeed(value:unknown){return typeof value==='string'&&/^[a-zA-Z0-9_-]{3,32}$/.test(value.trim())?value.trim().toLowerCase():'';}
export function applyOrder(g:Realm,owner:number,o:Order):string{
  if(!o||typeof o!=='object')return 'Invalid order.';
  const num=(k:string,min=0,max=1000000)=>typeof o[k]==='number'&&Number.isInteger(o[k])&&(o[k] as number)>=min&&(o[k] as number)<=max;
  switch(o.type){
    case 'build':return typeof o.kind==='string'&&Object.hasOwn(CATALOG,o.kind)&&num('x',0,255)&&num('y',0,255)?placeBuilding(g,owner,o.kind as BuildingKind,o.x as number,o.y as number):'Invalid building order.';
    case 'upgrade':return num('id')?upgradeBuilding(g,o.id as number,owner):'Invalid building.';
    case 'recruit':return ['worker','spear','archer','cavalry'].includes(o.kind as string)?recruit(g,owner,o.kind as RecruitKind):'Invalid recruitment.';
    case 'job':if(!JOBS.includes(o.job as Job)||!num('count',0,300))return 'Invalid job allocation.';setJobCount(g,owner,o.job as Job,o.count as number);return '';
    case 'assign':if(!num('id')||!JOBS.includes(o.job as Job)||!g.workers.some(w=>w.id===o.id&&w.city===owner))return 'Choose your own villager.';assignWorker(g,o.id as number,o.job as Job,owner);return '';
    case 'harvest':return num('id')&&num('node',0,65535)?orderHarvest(g,o.id as number,o.node as number,owner):'Invalid resource order.';
    case 'gift':return num('target',0,g.cities.length-1)&&!g.disabledCities?.includes(o.target as number)?gift(g,o.target as number,owner):'Choose an occupied settlement.';
    case 'deploy':return ['spear','archer','cavalry'].includes(o.kind as string)&&num('count',1,40)?deploy(g,owner,o.kind as UnitKind,o.count as number):'Invalid deployment.';
    case 'units':return Array.isArray(o.ids)&&o.ids.every(Number.isInteger)&&['move','attack','hold','return'].includes(o.order as string)?commandUnits(g,owner,o.ids as number[],o.order as any,o.x as number,o.y as number,typeof o.targetUnit==='number'?o.targetUnit:-1,typeof o.targetCity==='number'?o.targetCity:-1):'Invalid unit order.';
    case 'research':return research(g,owner,o.kind as 'weapons'|'armor');
    case 'raid':{
      if(!num('target',0,g.cities.length-1)||!num('count',1,40)||o.target===owner)return 'Choose another settlement and 1–40 spearmen.';
      const c=g.cities[o.target as number];if(g.disabledCities?.includes(c.id)||(c.protectedUntil||0)>g.time||(c.recoverUntil||0)>g.time)return 'That village is protected or unoccupied.';
      const before=new Set(g.soldiers?.map(u=>u.id));const error=deploy(g,owner,'spear',o.count as number);if(error)return error;
      const ids=g.soldiers!.filter(u=>u.city===owner&&!before.has(u.id)).map(u=>u.id);return commandUnits(g,owner,ids,'attack',undefined,undefined,-1,c.id);
    }
    default:return 'Unknown order.';
  }
}
