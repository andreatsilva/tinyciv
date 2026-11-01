import {MAP_SIZE,CATALOG,coords,indexOf,placementError,type Realm,type Building,type BuildingKind,type Worker} from './settlement.ts';
import {terrainTile,paintTree,paintOre,paintBuilding} from './game-art.ts';
import {unitHP,type Soldier} from './military.ts';
export interface Camera {x:number;y:number;zoom:number;offsetX?:number;offsetY?:number}
export interface GameView {camera:Camera;selectedBuilding:number;selectedWorker:number;selectedCity:number;placing:BuildingKind|null;hover:{x:number;y:number}|null;showNames:boolean;now:number;selectedUnits?:number[];selectionBox?:{x:number;y:number;x2:number;y2:number}|null}
export function screenToWorld(x:number,y:number,width:number,height:number,c:Camera){return {x:(x-width/2-(c.offsetX||0))/c.zoom+c.x,y:(y-height/2-(c.offsetY||0))/c.zoom+c.y};}
export function worldToScreen(x:number,y:number,width:number,height:number,c:Camera){return {x:(x-c.x)*c.zoom+width/2+(c.offsetX||0),y:(y-c.y)*c.zoom+height/2+(c.offsetY||0)};}
export const drawBuilding=paintBuilding;
function rect(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(x,y,w,h);}
function selection(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){
  c.strokeStyle=color;c.lineWidth=1.6;const k=Math.min(9,w*.2);c.beginPath();
  for(const [xx,yy,dx,dy]of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){c.moveTo(xx,yy+dy*k);c.lineTo(xx,yy);c.lineTo(xx+dx*k,yy);}c.stroke();
}
function worker(c:CanvasRenderingContext2D,w:Worker,x:number,y:number,s:number,color:string,now:number,selected:boolean){
  if(s<10){rect(c,x-1,y-1,2,2,color);return;}
  const k=Math.max(.8,s/20),walking=w.state==='walking'||w.state==='returning',step=walking?Math.sin(now*.017+w.id)*1.2:0;
  c.fillStyle='#1f382740';c.beginPath();c.ellipse(x+1,y+2.2*k,3.5*k,1.6*k,0,0,7);c.fill();
  if(selected){c.strokeStyle='#ecd28a';c.lineWidth=1.7;c.beginPath();c.ellipse(x,y+2*k,6*k,3*k,0,0,7);c.stroke();}
  rect(c,x-2*k,y-k,1.8*k,(3+step)*k,'#433c2b');rect(c,x+.3*k,y-k,1.8*k,(3-step)*k,'#514634');
  const coat=w.job==='builder'?'#b79354':w.job==='food'?'#a79459':w.job==='stone'?'#9da18e':w.job==='iron'?'#728e87':color;
  rect(c,x-2.8*k,y-6.7*k,5.6*k,6.7*k,'#3e4931');rect(c,x-2.1*k,y-6.5*k,3.9*k,5.4*k,coat);rect(c,x-2*k,y-2*k,4*k,1*k,'#655135');
  rect(c,x-1.9*k,y-10.5*k,3.8*k,4*k,'#c49a67');rect(c,x-1.4*k,y-10*k,2.7*k,2.5*k,'#e3bd83');
  rect(c,x-3.3*k,y-11.2*k,6.6*k,1.6*k,'#735c37');rect(c,x-2*k,y-13*k,4*k,2*k,w.job==='food'||w.job==='builder'?'#c3a66a':'#8a734b');
  rect(c,x-3.4*k,y-5.6*k,1.4*k,4*k,'#d3ad75');rect(c,x+2*k,y-5.6*k,1.4*k,4*k,'#c69e68');
  if(w.cargo>0){
    if(w.cargoType==='wood'){for(let n=0;n<2;n++){rect(c,x-3*k,y-(8-n*2)*k,7*k,2*k,'#8c6037');rect(c,x-3*k,y-(8-n*2)*k,1.7*k,2*k,'#d9b77a');rect(c,x-1*k,y-(8-n*2)*k,4*k,.6*k,'#c4975d');}}
    else{rect(c,x-3*k,y-8*k,6.5*k,4*k,w.cargoType==='food'?'#b99854':w.cargoType==='iron'?'#738d85':'#aeb7a0');rect(c,x-2*k,y-8*k,3*k,1*k,w.cargoType==='food'?'#dcc57a':'#d2d1b2');}
  }else if(w.state==='gathering'||w.state==='building'){
    c.save();c.translate(x+3*k,y-5*k);c.rotate(Math.sin(now*.013+w.id)*.85);rect(c,0,-6*k,1.3*k,9*k,'#a6844c');rect(c,-2*k,-7*k,5*k,2.3*k,w.job==='wood'?'#b9c7b7':'#a7b7a7');rect(c,-2*k,-7*k,5*k,.7*k,'#e2debd');c.restore();
  }
}
function plate(c:CanvasRenderingContext2D,text:string,x:number,y:number,small=false,color='#d8bd7b'){
  c.font=`${small?'9':'11'}px system-ui`;c.textAlign='center';const width=c.measureText(text).width+24;
  c.fillStyle='#23312bec';c.beginPath();c.roundRect(x-width/2,y-15,width,24,2);c.fill();c.strokeStyle='#b99a565c';c.lineWidth=1;c.stroke();c.fillStyle=color;c.fillText(text,x,y+.5);
}
export function drawWorkerPortrait(c:CanvasRenderingContext2D,w:Worker,width:number,height:number,color:string,now:number){c.clearRect(0,0,width,height);worker(c,w,width/2,height*.8,88,color,now,true);}
function soldier(c:CanvasRenderingContext2D,g:Realm,u:Soldier,x:number,y:number,s:number,v:GameView){
  const color=g.cities[u.city].color,selected=v.selectedUnits?.includes(u.id),k=Math.max(.5,s/23);if(s<9){rect(c,x-2,y-2,4,4,selected?'#ffe4a1':color);return;}
  c.save();c.translate(x,y);c.scale(k,k);c.fillStyle='#14231955';c.beginPath();c.ellipse(0,2,6,3,0,0,7);c.fill();if(selected){c.strokeStyle='#ffe2a0';c.lineWidth=1.7;c.beginPath();c.ellipse(0,2,8,4,0,0,7);c.stroke();}
  const step=u.pathAt<u.path.length||u.state==='move'||u.state==='attack'?Math.sin(v.now*.014+u.id)*1.4:0;
  if(u.kind==='cavalry'){rect(c,-6,-7,12,6,'#79543b');rect(c,4,-12,4,8,'#9c744b');rect(c,5,-14,2,4,'#463d30');for(const xx of [-5,3])rect(c,xx,0,2,5+step,'#4a3b2d');}
  else{rect(c,-3,-1,2,4+step,'#454b49');rect(c,1,-1,2,4-step,'#454b49');}
  const rise=u.kind==='cavalry'?6:0;rect(c,-4,-9-rise,8,8,'#697f80');rect(c,-3,-8-rise,6,7,color);rect(c,-2,-13-rise,4,4,'#dab487');rect(c,-3,-15-rise,6,3,'#acb8b0');rect(c,-3,-15-rise,6,1,'#e3dfc5');rect(c,-1,-18-rise,2,3,color);
  if(u.kind==='archer'){c.strokeStyle='#c4a574';c.lineWidth=1.4;c.beginPath();c.arc(4,-7,5,-1.4,1.4);c.stroke();c.beginPath();c.moveTo(5,-12);c.lineTo(5,-2);c.stroke();}else{rect(c,6,-20-rise,1,22,'#b6a278');c.fillStyle='#dde4d7';c.beginPath();c.moveTo(4,-19-rise);c.lineTo(6.5,-25-rise);c.lineTo(9,-19-rise);c.fill();c.fillStyle=color;c.beginPath();c.ellipse(-4,-5-rise,3,5,0,0,7);c.fill();c.strokeStyle='#d8c18b';c.stroke();}
  if(selected||u.hp<unitHP(g,u.city,u.kind)){rect(c,-8,-28-rise,16,2,'#263c32');rect(c,-8,-28-rise,16*Math.max(0,u.hp/unitHP(g,u.city,u.kind)),2,u.city===0?'#b9cf7b':'#da9879');}c.restore();
}
export function renderRealm(c:CanvasRenderingContext2D,g:Realm,width:number,height:number,v:GameView,base?:HTMLCanvasElement){
  const s=v.camera.zoom,ox=width/2+(v.camera.offsetX||0)-v.camera.x*s,oy=height/2+(v.camera.offsetY||0)-v.camera.y*s;
  c.clearRect(0,0,width,height);rect(c,0,0,width,height,'#3e6665');c.imageSmoothingEnabled=false;
  const minX=Math.max(0,Math.floor(-ox/s)-2),minY=Math.max(0,Math.floor(-oy/s)-4),maxX=Math.min(MAP_SIZE-1,Math.ceil((width-ox)/s)+2),maxY=Math.min(MAP_SIZE-1,Math.ceil((height-oy)/s)+3);
  if(s<8&&base)c.drawImage(base,ox,oy,MAP_SIZE*s,MAP_SIZE*s);
  else for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)terrainTile(c,g,g.cells[indexOf(x,y)],x,y,ox+x*s,oy+y*s,s,v.now);
  c.imageSmoothingEnabled=true;
  const home=g.cities[0];
  if(v.placing){c.save();c.strokeStyle='#e8d69a66';c.setLineDash([3,8]);c.lineWidth=1;c.beginPath();c.arc(ox+(home.x+.5)*s,oy+(home.y+.5)*s,15.5*s,0,7);c.stroke();c.restore();}
  const entries:{y:number;type:'tree'|'rock'|'building'|'worker'|'soldier';value:number|Building|Worker|Soldier}[]=[];
  if(s>=8)for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const i=indexOf(x,y),t=g.cells[i];if(t.ground==='forest')entries.push({y:y+.78,type:'tree',value:i});else if(t.ground==='stone'||t.ground==='iron')entries.push({y:y+.7,type:'rock',value:i});}
  for(const b of g.buildings)if(b.x>=minX-4&&b.x<=maxX&&b.y>=minY-4&&b.y<=maxY)entries.push({y:b.y+CATALOG[b.kind].height-.15,type:'building',value:b});
  for(const w of g.workers)if(!g.disabledCities?.includes(w.city)&&w.x>=minX&&w.x<=maxX&&w.y>=minY&&w.y<=maxY)entries.push({y:w.y,type:'worker',value:w});
  for(const u of g.soldiers||[])if(u.x>=minX&&u.x<=maxX&&u.y>=minY&&u.y<=maxY)entries.push({y:u.y,type:'soldier',value:u});
  entries.sort((a,b)=>a.y-b.y);
  for(const e of entries){
    if(e.type==='tree'){const i=e.value as number,p=coords(i);paintTree(c,ox+p.x*s,oy+p.y*s,s,g.cells[i].variation,v.now);}
    if(e.type==='rock'){const i=e.value as number,p=coords(i);paintOre(c,ox+p.x*s,oy+p.y*s,s,g.cells[i].ground==='iron',g.cells[i].variation);}
    if(e.type==='building'){
      const b=e.value as Building;
      if(b.id===v.selectedBuilding){c.fillStyle='#dfca7e19';c.fillRect(ox+b.x*s,oy+b.y*s,CATALOG[b.kind].width*s,CATALOG[b.kind].height*s);selection(c,ox+b.x*s-3,oy+b.y*s-3,CATALOG[b.kind].width*s+6,CATALOG[b.kind].height*s+6,'#f2d48e');}
      paintBuilding(c,b,ox+b.x*s,oy+b.y*s,s,g.cities[b.city].color,v.now);
    }
    if(e.type==='worker'){const w=e.value as Worker;worker(c,w,ox+w.x*s,oy+w.y*s,s,g.cities[w.city].color,v.now,w.id===v.selectedWorker);}
    if(e.type==='soldier'){const u=e.value as Soldier;soldier(c,g,u,ox+u.x*s,oy+u.y*s,s,v);}
  }
  for(const a of g.armies)if(a.x>=minX&&a.x<=maxX&&a.y>=minY&&a.y<=maxY){
    for(let j=0;j<Math.min(8,a.troops);j++){const x=ox+a.x*s+(j%3-1)*s*.28,y=oy+a.y*s+Math.floor(j/3)*s*.24;worker(c,{...g.workers[0],id:a.id+j,cargo:0,job:'wood',state:'walking'},x,y,s,g.cities[a.city].color,v.now,false);rect(c,x+s*.18,y-s*.71,1,s*.75,'#6f6748');rect(c,x+s*.14,y-s*.77,s*.1,s*.11,'#d8ddc3');}
    plate(c,`${a.troops} spearmen`,ox+a.x*s,oy+a.y*s-s*1.05,true);
  }
  for(const city of g.cities){
    if(city.x<minX-6||city.x>maxX+6||city.y<minY-8||city.y>maxY+8)continue;
    if(s<12){c.fillStyle=city.id===0?'#ecd197':city.color;c.beginPath();c.arc(ox+city.x*s,oy+city.y*s,Math.max(3,s*.6),0,7);c.fill();c.strokeStyle='#29392c';c.stroke();}
    const label=g.disabledCities?.includes(city.id)?'Unclaimed':g.humanCities?.includes(city.id)?`${city.ruler} · ${city.name}`:city.name;
    if(s<12&&v.showNames)plate(c,label,ox+city.x*s,oy+city.y*s-9,true,city.id===0?'#f2d58c':'#e1debd');
    else if(s>12&&city.id!==0)plate(c,label,ox+(city.x+.5)*s,oy+(city.y-4)*s,false);
    if(city.health!==undefined&&s>12){const max=500+g.buildings.find(b=>b.city===city.id&&b.kind==='hall')!.level*125;rect(c,ox+(city.x-.5)*s,oy+(city.y-2)*s,3*s,4,'#263c32');rect(c,ox+(city.x-.5)*s,oy+(city.y-2)*s,3*s*Math.min(1,city.health/max),4,'#cbb078');}
  }
  if(v.placing&&v.hover){
    const p=v.hover,d=CATALOG[v.placing],error=placementError(g,0,v.placing,p.x,p.y),px=ox+p.x*s,py=oy+p.y*s;
    c.fillStyle=error?'#b25c423f':'#d0db8138';c.fillRect(px,py,d.width*s,d.height*s);c.strokeStyle=error?'#d89570':'#d8e39b';c.lineWidth=1;
    for(let xx=0;xx<=d.width;xx++){c.beginPath();c.moveTo(px+xx*s,py);c.lineTo(px+xx*s,py+d.height*s);c.stroke();}for(let yy=0;yy<=d.height;yy++){c.beginPath();c.moveTo(px,py+yy*s);c.lineTo(px+d.width*s,py+yy*s);c.stroke();}
    c.globalAlpha=.7;paintBuilding(c,{id:0,city:0,kind:v.placing,x:p.x,y:p.y,level:1,progress:1,complete:true},px,py,s,g.cities[0].color,v.now,true);c.globalAlpha=1;selection(c,px,py,d.width*s,d.height*s,error?'#edab7b':'#e5efaf');
  }else if(v.hover&&s>=18){
    const h=v.hover,w=g.workers.find(w=>Math.hypot(w.x-h.x-.5,w.y-h.y-.5)<.75);
    if(w){const text=`${w.name} · ${w.cargo?`${w.cargo} ${w.cargoType}`:w.state==='gathering'?`Gathering ${w.job}`:w.state==='building'?'Building':w.state==='idle'?'Ready':w.state==='returning'?'Delivering':'Walking'}`;plate(c,text,ox+w.x*s,oy+w.y*s-s*.95,true,'#f0dfae');}
  }
  for(const e of g.effects||[]){const progress=1-(e.until-g.time)/.32;c.strokeStyle='#eed7a3';c.lineWidth=1.5;c.beginPath();c.moveTo(ox+(e.x+(e.tx-e.x)*Math.max(0,progress-.2))*s,oy+(e.y+(e.ty-e.y)*Math.max(0,progress-.2))*s);c.lineTo(ox+(e.x+(e.tx-e.x)*progress)*s,oy+(e.y+(e.ty-e.y)*progress)*s);c.stroke();}
  if(v.selectionBox){const b=v.selectionBox;c.fillStyle='#e8d59a22';c.strokeStyle='#efd896';c.lineWidth=1;c.fillRect(b.x,b.y,b.x2-b.x,b.y2-b.y);c.strokeRect(b.x,b.y,b.x2-b.x,b.y2-b.y);}
  const vignette=c.createRadialGradient(width*.45,height*.42,width*.25,width*.5,height*.5,width*.82);vignette.addColorStop(0,'#112a1b00');vignette.addColorStop(1,'#11251a48');c.fillStyle=vignette;c.fillRect(0,0,width,height);
}
export function minimapCanvas(g:Realm){
  const canvas=document.createElement('canvas');canvas.width=MAP_SIZE;canvas.height=MAP_SIZE;const c=canvas.getContext('2d')!,data=c.createImageData(MAP_SIZE,MAP_SIZE);
  const colors:Record<string,number[]>={grass:[133,157,87],sand:[193,178,128],water:[79,132,132],forest:[68,105,61],stone:[148,158,130],iron:[113,144,127]};
  g.cells.forEach((t,i)=>{const col=t.traffic>3?[171,149,101]:colors[t.ground],d=(t.variation-.5)*9;data.data.set([col[0]+d,col[1]+d,col[2]+d,255],i*4);});c.putImageData(data,0,0);return canvas;
}
export function drawMinimap(c:CanvasRenderingContext2D,g:Realm,base:HTMLCanvasElement,v:GameView,w:number,h:number,mapWidth:number,mapHeight:number){
  c.clearRect(0,0,w,h);c.imageSmoothingEnabled=false;c.drawImage(base,0,0,w,h);
  for(const city of g.cities){c.fillStyle=city.id===0?'#ffe2a0':city.color;c.beginPath();c.arc(city.x/MAP_SIZE*w,city.y/MAP_SIZE*h,city.id===0?3.5:2.3,0,7);c.fill();c.strokeStyle='#1a3526';c.lineWidth=1;c.stroke();}
  const vw=mapWidth/v.camera.zoom/MAP_SIZE*w,vh=mapHeight/v.camera.zoom/MAP_SIZE*h;
  const cx=(v.camera.x-(v.camera.offsetX||0)/v.camera.zoom)/MAP_SIZE*w,cy=(v.camera.y-(v.camera.offsetY||0)/v.camera.zoom)/MAP_SIZE*h;
  c.strokeStyle='#f3daa0';c.lineWidth=1.3;c.strokeRect(cx-vw/2,cy-vh/2,vw,vh);
}
