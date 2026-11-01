import { WIDTH, HEIGHT, territory, type World } from './simulation';
export type Layer = 'civilizations'|'terrain'|'resources';
export interface View { layer: Layer; selected: number; borders: boolean; labels: boolean; time: number; zoom: number; panX: number; panY: number; cursor: number }
export const DEFAULT_VIEW: View={layer:'civilizations',selected:-1,borders:true,labels:true,time:0,zoom:1,panX:0,panY:0,cursor:-1};
export function mapGeometry(width:number,height:number,view:View) {const size=Math.min(width/(WIDTH+7),height/(HEIGHT+7))*view.zoom;return {size,ox:(width-WIDTH*size)/2+view.panX,oy:(height-HEIGHT*size)/2+view.panY};}
export function drawWorld(ctx:CanvasRenderingContext2D,w:World,width:number,height:number,v:View,exporting=false) {
  const {size:s,ox,oy}=mapGeometry(width,height,v);ctx.clearRect(0,0,width,height);ctx.fillStyle='#b9d3cf';ctx.fillRect(0,0,width,height);ctx.save();
  // A quiet, gridded ocean gives the little world room to breathe.
  ctx.strokeStyle='#aac9c5';ctx.lineWidth=.5;
  for(let y=0;y<height;y+=s*3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  for(let x=0;x<width;x+=s*3){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(const t of w.tiles) {
    const x=ox+t.x*s,y=oy+t.y*s, d=t.detail;
    if(t.terrain==='water'){
      if(d>.94){ctx.fillStyle='#d3e5de';ctx.fillRect(x,y+s*.6,s*.8,1);if(d>.98)ctx.fillRect(x+s*.2,y+s*.35,s*.35,1);}continue;
    }
    const f=t.owner>=0?w.factions[t.owner]:null;
    ctx.fillStyle=t.terrain==='sand'?'#dcd4a7':t.terrain==='mountain'?'#99a48b':d>.6?'#a9bd7d':d>.3?'#b7c98c':'#b0c382';ctx.fillRect(x,y,s+.5,s+.5);
    if(f && v.layer==='civilizations'){ctx.globalAlpha=v.selected<0||v.selected===f.id?.33:.14;ctx.fillStyle=f.color;ctx.fillRect(x,y,s+.5,s+.5);ctx.globalAlpha=1;}
    if(v.layer==='resources'){ctx.fillStyle=t.terrain==='forest'?'#467754':t.terrain==='mountain'?'#c5a35a':t.fertility>1.1?'#e8d58c':'#95b47a';ctx.globalAlpha=.6;ctx.fillRect(x,y,s+.5,s+.5);ctx.globalAlpha=1;}
    if(t.terrain==='forest') {
      const h=s*(.7+d*.45);ctx.fillStyle='#586f48';ctx.fillRect(x+s*.45,y+s*.5,s*.13,h*.5);
      ctx.fillStyle=d>.5?'#69875a':'#78945d';ctx.beginPath();ctx.moveTo(x+s*.04,y+s*.7);ctx.lineTo(x+s*.5,y-h*.35);ctx.lineTo(x+s*.98,y+s*.7);ctx.closePath();ctx.fill();
      ctx.fillStyle=d>.5?'#496c50':'#58784d';ctx.beginPath();ctx.moveTo(x+s*.5,y-h*.35);ctx.lineTo(x+s*.98,y+s*.7);ctx.lineTo(x+s*.5,y+s*.7);ctx.closePath();ctx.fill();
    } else if(t.terrain==='mountain') {
      ctx.fillStyle='#8c9580';ctx.beginPath();ctx.moveTo(x-s*.2,y+s);ctx.lineTo(x+s*.55,y-s*.7);ctx.lineTo(x+s*1.3,y+s);ctx.fill();ctx.fillStyle='#a9b099';ctx.beginPath();ctx.moveTo(x-s*.2,y+s);ctx.lineTo(x+s*.55,y-s*.7);ctx.lineTo(x+s*.55,y+s);ctx.fill();ctx.fillStyle='#e3e1cd';ctx.beginPath();ctx.moveTo(x+s*.3,y-s*.15);ctx.lineTo(x+s*.55,y-s*.7);ctx.lineTo(x+s*.8,y-s*.15);ctx.lineTo(x+s*.55,y-s*.28);ctx.fill();
    } else if(f && d>.82 && t.terrain==='grass') {
      if(d>.965)house(ctx,x,y,s,f.color);
      else {ctx.fillStyle='#bac17c';ctx.fillRect(x+s*.1,y+s*.15,s*.8,s*.65);ctx.fillStyle='#d0cb8b';for(let j=0;j<3;j++)ctx.fillRect(x+s*.15,y+s*(.2+j*.2),s*.7,s*.06);}
    } else if(d>.9 && t.terrain==='grass'){ctx.fillStyle='#8da66a';ctx.fillRect(x+s*.4,y+s*.4,s*.15,s*.22);}
  }
  if(v.borders && v.layer==='civilizations') {
    ctx.lineWidth=Math.max(1,s*.16);
    for(const t of w.tiles)if(t.owner>=0) {
      ctx.strokeStyle=w.factions[t.owner].color;ctx.globalAlpha=v.selected<0||v.selected===t.owner?.9:.25;
      const x=ox+t.x*s,y=oy+t.y*s,i=t.y*WIDTH+t.x;ctx.beginPath();
      if(t.x===0||w.tiles[i-1].owner!==t.owner){ctx.moveTo(x,y);ctx.lineTo(x,y+s);}
      if(t.x===WIDTH-1||w.tiles[i+1].owner!==t.owner){ctx.moveTo(x+s,y);ctx.lineTo(x+s,y+s);}
      if(t.y===0||w.tiles[i-WIDTH].owner!==t.owner){ctx.moveTo(x,y);ctx.lineTo(x+s,y);}
      if(t.y===HEIGHT-1||w.tiles[i+WIDTH].owner!==t.owner){ctx.moveTo(x,y+s);ctx.lineTo(x+s,y+s);}ctx.stroke();
    }ctx.globalAlpha=1;
  }
  for(const f of w.factions) if(f.alive) {
    const t=w.tiles[f.capital],x=ox+(t.x+.5)*s,y=oy+(t.y+.5)*s;
    ctx.fillStyle=f.light;ctx.beginPath();ctx.ellipse(x,y+s*.6,s*1.7,s*.7,0,0,Math.PI*2);ctx.fill();
    house(ctx,x-s*.65,y-s*.5,s*1.5,f.color);ctx.fillStyle='#ece5c4';ctx.fillRect(x+s*.2,y-s*1.6,s*.1,s*1.3);ctx.fillStyle=f.color;ctx.fillRect(x+s*.3,y-s*1.6,s*.7,s*.4);
    if(v.labels){ctx.font=`600 ${Math.max(10,s*1.05)}px system-ui`;ctx.textAlign='center';const tw=ctx.measureText(f.name).width;ctx.fillStyle='#f8f6e8ed';ctx.beginPath();ctx.roundRect(x-tw/2-9,y+s*1.2,tw+18,s*1.9+5,4);ctx.fill();ctx.fillStyle='#344638';ctx.fillText(f.name,x,y+s*2.65);ctx.fillStyle=f.color;ctx.beginPath();ctx.arc(x-tw/2-3,y+s*2.2,2.1,0,7);ctx.fill();}
    if(v.selected===f.id){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,s*2.4,0,7);ctx.stroke();}
  }
  // Mark the fronts of active wars between actual capitals.
  for(const [a,b] of w.wars) {const ta=w.tiles[w.factions[a].capital],tb=w.tiles[w.factions[b].capital];const x=ox+(ta.x+tb.x)/2*s,y=oy+(ta.y+tb.y)/2*s;ctx.fillStyle='#b15e48';ctx.beginPath();ctx.arc(x,y,s*1.1,0,7);ctx.fill();ctx.fillStyle='#fff6df';ctx.font=`${s*1.3}px system-ui`;ctx.textAlign='center';ctx.fillText('⚔',x,y+s*.45);}
  if(v.cursor>=0){const t=w.tiles[v.cursor];ctx.strokeStyle='#fffbed';ctx.lineWidth=3;ctx.strokeRect(ox+t.x*s-1,oy+t.y*s-1,s+2,s+2);ctx.strokeStyle='#344e3b';ctx.lineWidth=1;ctx.strokeRect(ox+t.x*s-1,oy+t.y*s-1,s+2,s+2);}
  // Map furniture.
  ctx.textAlign='center';ctx.fillStyle='#4f7a798c';ctx.font=`italic ${Math.max(13,s*1.5)}px Georgia`;ctx.fillText('The Quiet Sea',width*.19,height*.86);
  const cx=width-42,cy=height-48;ctx.strokeStyle='#52757588';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,cy-15);ctx.lineTo(cx,cy+15);ctx.moveTo(cx-15,cy);ctx.lineTo(cx+15,cy);ctx.stroke();ctx.fillStyle='#527575';ctx.beginPath();ctx.moveTo(cx,cy-17);ctx.lineTo(cx-4,cy);ctx.lineTo(cx+4,cy);ctx.fill();ctx.font='9px system-ui';ctx.fillText('N',cx,cy-23);
  if(exporting){ctx.fillStyle='#f7f7edee';ctx.fillRect(16,16,264,66);ctx.fillStyle='#314336';ctx.textAlign='left';ctx.font='bold 18px Georgia';ctx.fillText('Tiny Civilization',30,43);ctx.font='12px system-ui';ctx.fillText(`Year ${w.year}  ·  ${w.factions.filter(f=>f.alive).length} civilizations  ·  ${Math.floor(w.factions.reduce((n,f)=>n+f.population,0))} people`,30,64);ctx.textAlign='right';ctx.fillStyle='#34504a';ctx.font='12px system-ui';ctx.fillText(`Seed: ${w.seed}`,width-20,height-17);}
  ctx.restore();
}
function house(ctx:CanvasRenderingContext2D,x:number,y:number,s:number,color:string){ctx.fillStyle='#f1dfb8';ctx.fillRect(x+s*.15,y+s*.25,s*.7,s*.6);ctx.fillStyle='#9a8465';ctx.fillRect(x+s*.58,y+s*.25,s*.27,s*.6);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-s*.05,y+s*.3);ctx.lineTo(x+s*.5,y-s*.25);ctx.lineTo(x+s*1.05,y+s*.3);ctx.closePath();ctx.fill();ctx.fillStyle='#645944';ctx.fillRect(x+s*.4,y+s*.55,s*.18,s*.3);}
export function drawChart(ctx:CanvasRenderingContext2D,history:World[],width:number,height:number){ctx.clearRect(0,0,width,height);const max=Math.max(100,...history.flatMap(w=>w.factions.map(f=>f.population)));const pad=8;ctx.strokeStyle='#e6e8de';ctx.lineWidth=1;for(let y=pad;y<height;y+=(height-pad*2)/3){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}if(!history.length)return;for(const f of history[history.length-1].factions){ctx.strokeStyle=f.color;ctx.lineWidth=2;ctx.beginPath();history.forEach((w,i)=>{const x=i/Math.max(1,history.length-1)*width,y=height-pad-(w.factions[f.id]?.population||0)/max*(height-pad*2);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}}
export function stats(w:World){return {population:Math.floor(w.factions.reduce((n,f)=>n+f.population,0)),factions:w.factions.filter(f=>f.alive).length,land:Math.round(w.tiles.filter(t=>t.owner>=0).length/w.tiles.filter(t=>t.terrain!=='water'&&t.terrain!=='mountain').length*100),territories:w.factions.map(f=>territory(w,f.id))};}
