export type Terrain = 'water' | 'sand' | 'grass' | 'forest' | 'mountain';
export interface Tile { x: number; y: number; terrain: Terrain; owner: number; fertility: number; detail: number }
export interface Faction { id: number; name: string; color: string; light: string; population: number; food: number; wood: number; gold: number; capital: number; aggression: number; founded: number; alive: boolean }
export interface ChronicleEvent { year: number; type: 'founding'|'growth'|'war'|'peace'|'collapse'|'nature'; text: string; factions: number[] }
export interface World { version: 1; seed: string; name: string; year: number; rng: number; tiles: Tile[]; factions: Faction[]; wars: [number,number,number][]; events: ChronicleEvent[]; climate: string; kind: string; initialTribes: number }
export const WIDTH = 76, HEIGHT = 52;
export const PALETTE = [ ['Mosswood', '#527858', '#dce8c9'], ['Sunfolk', '#c19542', '#f2e4b7'], ['Emberclan', '#b56750', '#edccbb'], ['Riverkin', '#668d9f', '#d0e2e7'], ['Moonveil', '#8c78a2', '#ded3ea'], ['Dawnreach', '#aa7a91', '#edcfe0'] ];
export function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function random(w: World) { w.rng = (w.rng + 0x6d2b79f5) | 0; let t = w.rng; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
export function neighbors(i: number) { const x = i % WIDTH, y = Math.floor(i / WIDTH); return [x > 0 ? i-1 : -1, x < WIDTH-1 ? i+1 : -1, y > 0 ? i-WIDTH : -1, y < HEIGHT-1 ? i+WIDTH : -1].filter(v=>v>=0); }
export function territory(w: World, id: number) { return w.tiles.reduce((n,t)=>n+Number(t.owner===id),0); }
function log(w: World, type: ChronicleEvent['type'], text: string, factions: number[] = []) { w.events.unshift({year:w.year,type,text,factions}); w.events = w.events.slice(0,150); }
export function addTribe(w: World, index: number) {
  const tile = w.tiles[index]; if (!tile || tile.terrain === 'water' || tile.terrain === 'mountain' || tile.owner >= 0 || w.factions.length >= 6) return false;
  const id=w.factions.length, p=PALETTE[id];
  const faction: Faction = {id,name:p[0],color:p[1],light:p[2],population:32,food:90,wood:25,gold:8,capital:index,aggression:.25+random(w)*.5,founded:w.year,alive:true};
  w.factions.push(faction);
  const queue=[index]; const seen=new Set<number>();
  while(queue.length && seen.size<22) { const i=queue.shift()!; if(seen.has(i)) continue; const t=w.tiles[i]; if(t.owner!==-1 || t.terrain==='water' || t.terrain==='mountain') continue; seen.add(i); t.owner=id; queue.push(...neighbors(i)); }
  log(w,'founding',`${faction.name} settles by the ${tile.y<HEIGHT/2?'northern hills':'southern shores'}. A new story begins.`,[id]); return true;
}
export function createWorld(seed='wildflower', kind='Pangaea', count=4): World {
  const safe=seed.trim().slice(0,48)||'wildflower';
  const w: World={version:1,seed:safe,name:'The Wildflower Isles',year:1,rng:hash(safe),tiles:[],factions:[],wars:[],events:[],climate:'Temperate',kind,initialTribes:Math.max(2,Math.min(6,count))};
  const phase=random(w)*6.28;
  for(let y=0;y<HEIGHT;y++) for(let x=0;x<WIDTH;x++) {
    const nx=(x-WIDTH/2)/(WIDTH*.43), ny=(y-HEIGHT/2)/(HEIGHT*.40);
    const a=Math.atan2(ny,nx), r=Math.hypot(nx,ny);
    const boundary=1 + .1*Math.sin(a*5+phase)+.07*Math.cos(a*9-phase)+.04*Math.sin(x*.6+y*.3);
    const split=kind==='Archipelago' && ((Math.abs(x-36+Math.sin(y*.2)*5)<2) || (y>27 && y<30 && x>42));
    const d=random(w), detail=random(w);
    let terrain: Terrain = r>boundary || split ? 'water' : r>boundary-.07 ? 'sand' : 'grass';
    if(terrain==='grass') { const ridge=Math.sin(x*.18+phase)+Math.cos(y*.27)+Math.sin((x+y)*.11); if(ridge>1.9 && d>.16) terrain='mountain'; else if(d>.57 || ridge<-.8) terrain='forest'; }
    w.tiles.push({x,y,terrain,owner:-1,fertility:.6+random(w)*.7,detail});
  }
  const targets=[[.33,.32],[.64,.32],[.65,.68],[.32,.67],[.48,.21],[.48,.76]];
  for(let n=0;n<Math.max(2,Math.min(6,count));n++) {
    const [tx,ty]=targets[n]; const sorted=w.tiles.map((t,i)=>({i,d:Math.hypot(t.x-tx*WIDTH,t.y-ty*HEIGHT)})).sort((a,b)=>a.d-b.d);
    for(const {i} of sorted) if(addTribe(w,i)) break;
  }
  return w;
}
export function step(w: World) {
  w.year++;
  const owned=w.factions.map(f=>w.tiles.flatMap((t,i)=>t.owner===f.id?[i]:[]));
  for(const f of w.factions) {
    if(!f.alive) continue;
    const land=owned[f.id]; if(!land.length || f.population<5) { f.alive=false;f.population=0;for(const t of w.tiles) if(t.owner===f.id)t.owner=-1;log(w,'collapse',`${f.name} falls. Its last villages are reclaimed by the wild.`,[f.id]);continue; }
    if(w.tiles[f.capital].owner!==f.id) {f.capital=land[Math.floor(random(w)*land.length)]; f.population*=.78;log(w,'war',`${f.name} loses its capital and retreats inland.`,[f.id]);}
    const harvest=land.reduce((n,i)=>n+w.tiles[i].fertility*(w.tiles[i].terrain==='sand'?.45:1),0)*.66;
    f.food=Math.max(0,Math.min(9999,f.food+harvest-f.population*.18));
    f.wood=Math.min(9999,f.wood+land.filter(i=>w.tiles[i].terrain==='forest').length*.12);
    f.gold=Math.min(9999,f.gold+land.length*.015);
    const capacity=land.length*3.3;
    f.population=Math.max(0,f.population+(f.food>5?Math.min(f.population*.027,(capacity-f.population)*.07):-f.population*.1));
    const frontier=land.flatMap(i=>neighbors(i)).filter(i=>w.tiles[i].terrain!=='water' && w.tiles[i].terrain!=='mountain' && w.tiles[i].owner!==f.id);
    for(let a=0;a<Math.min(7,1+Math.floor(f.population/75));a++) {
      if(!frontier.length)break;
      const i=frontier[Math.floor(random(w)*frontier.length)], t=w.tiles[i];
      if(t.owner===f.id) continue;
      if(t.owner<0) { t.owner=f.id; f.wood=Math.max(0,f.wood-.3); }
      else {
        const enemy=w.factions[t.owner]; let war=w.wars.find(p=>p.includes(f.id) && p.slice(0,2).includes(enemy.id));
        if(!war && random(w)<f.aggression*.06 && w.year>35) {war=[f.id,enemy.id,w.year];w.wars.push(war);log(w,'war',`${f.name} declares war on ${enemy.name}. The border will not hold.`,[f.id,enemy.id]);}
        if(war && random(w)<.52+(f.population-enemy.population)/2000) {t.owner=f.id;enemy.population=Math.max(0,enemy.population-2.8);f.population=Math.max(0,f.population-.7);}
      }
    }
    if(w.year%50===0 && f.population>100) log(w,'growth',`${f.name} reaches ${Math.floor(f.population)} people. Its villages flourish.`,[f.id]);
  }
  w.wars=w.wars.filter(([a,b,start])=> {if(!w.factions[a].alive||!w.factions[b].alive)return false;if(w.year-start>35 && random(w)<.06){log(w,'peace',`${w.factions[a].name} and ${w.factions[b].name} agree to an uneasy peace.`,[a,b]);return false;}return true;});
  if(w.year%83===0) { const f=w.factions.filter(f=>f.alive)[Math.floor(random(w)*w.factions.filter(f=>f.alive).length)]; if(f){f.food*=.35;f.population*=.89;log(w,'nature',`A dry season tests ${f.name}. Food stores dwindle.`,[f.id]);} }
  if(w.year%127===0){const f=w.factions.filter(f=>f.alive).sort((a,b)=>b.population-a.population)[0];if(f){f.food+=120;log(w,'nature',`Rain returns to ${f.name}. The fields turn green again.`,[f.id]);}}
}
export function clone(w: World): World { return structuredClone(w); }
/** Reuse unchanged, immutable tile snapshots so a long timeline stays small. */
export function capture(w: World, previous?: World): World {
  return {...w, tiles:w.tiles.map((t,i)=>{const p=previous?.tiles[i];return p&&p.x===t.x&&p.y===t.y&&p.owner===t.owner&&p.terrain===t.terrain&&p.fertility===t.fertility&&p.detail===t.detail?p:{...t};}),factions:w.factions.map(f=>({...f})),wars:w.wars.map(p=>[...p]),events:w.events.map(e=>({...e,factions:[...e.factions]}))};
}
export function validateWorld(value: unknown): value is World {
  if(!value||typeof value!=='object')return false;const w=value as World;
  try {
    if(!Number.isInteger(w.initialTribes)||w.initialTribes<2||w.initialTribes>6)return false;
    return w.version===1 && typeof w.seed==='string' && w.seed.length<=48 && typeof w.name==='string' && w.name.length<=100 && ['Pangaea','Archipelago'].includes(w.kind) && w.climate==='Temperate' && Number.isInteger(w.year) && w.year>0 && w.year<10000000 && Number.isFinite(w.rng) && Array.isArray(w.tiles) && w.tiles.length===WIDTH*HEIGHT && Array.isArray(w.factions) && w.factions.length>=2 && w.factions.length<=6 && w.factions.every((f,i)=>f.id===i&&f.name===PALETTE[i][0]&&f.color===PALETTE[i][1]&&f.light===PALETTE[i][2]&&typeof f.alive==='boolean'&&Number.isFinite(f.founded)&&f.founded>=1&&Number.isFinite(f.population)&&f.population>=0&&f.population<1000000&&Number.isInteger(f.capital)&&f.capital>=0&&f.capital<w.tiles.length&&[f.food,f.wood,f.gold,f.aggression].every(n=>Number.isFinite(n)&&n>=0&&n<1000000)) && w.tiles.every((t,i)=>t.x===i%WIDTH&&t.y===Math.floor(i/WIDTH)&&['water','sand','grass','forest','mountain'].includes(t.terrain)&&Number.isInteger(t.owner)&&t.owner>=-1&&t.owner<w.factions.length&&Number.isFinite(t.fertility)&&t.fertility>=0&&t.fertility<=2&&Number.isFinite(t.detail)&&t.detail>=0&&t.detail<=1) && Array.isArray(w.events) && w.events.length<=150 && w.events.every(e=>Number.isFinite(e.year)&&typeof e.text==='string'&&e.text.length<400&&['founding','growth','war','peace','collapse','nature'].includes(e.type)&&Array.isArray(e.factions)&&e.factions.every(id=>Number.isInteger(id)&&id>=0&&id<w.factions.length)) && Array.isArray(w.wars) && w.wars.length<=15 && w.wars.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isInteger)&&p[0]>=0&&p[1]>=0&&p[0]!==p[1]&&p[0]<w.factions.length&&p[1]<w.factions.length&&p[2]>=1&&p[2]<=w.year);
  } catch { return false; }
}
