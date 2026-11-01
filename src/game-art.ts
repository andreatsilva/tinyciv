import {CATALOG,MAP_SIZE,indexOf,type Realm,type Cell,type Building,type Resource} from './settlement.ts';

// Visual randomness is deliberately independent of the simulation's seeded RNG.
function noise(seed:number){let n=seed|0;return ()=>{n=Math.imul(n,1664525)+1013904223|0;return (n>>>0)/4294967296;};}
function box(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){c.fillStyle=color;c.fillRect(x,y,w,h);}
function polygon(c:CanvasRenderingContext2D,points:number[][],fill:string,stroke?:string){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function ellipse(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string|CanvasGradient){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();}
const textures=new Map<string,HTMLCanvasElement>();
function texture(kind:string,variant:number){
  const key=kind+variant;if(textures.has(key))return textures.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d')!,r=noise(variant*1171+kind.length*683);
  const base=kind==='sand'?'#c4b280':kind==='dirt'?'#ad9263':kind==='forest'?'#71874d':'#8ba65e';box(c,0,0,64,64,base);
  for(let i=0;i<560;i++){const x=r()*64,y=r()*64;c.globalAlpha=.08+r()*.16;box(c,x,y,1+r()*2,1+r()*2,r()>.5?'#d4d39a':'#47592f');}c.globalAlpha=1;
  if(kind==='grass'||kind==='forest')for(let i=0;i<38;i++){const x=r()*64,y=r()*64,c1=r()>.5?'#738f4b':'#a3ba73';box(c,x,y,1,2+r()*3,c1);if(i%3===0)box(c,x-1,y+1,3,1,c1);}
  if(kind==='dirt'||kind==='sand')for(let i=0;i<22;i++){const x=r()*64,y=r()*64;box(c,x,y,2,1,'#d4bf8e');box(c,x+1,y+1,2,1,'#8b774f55');}
  textures.set(key,canvas);return canvas;
}
export function terrainTile(c:CanvasRenderingContext2D,g:Realm,t:Cell,wx:number,wy:number,x:number,y:number,s:number,now:number){
  const variant=Math.floor(t.variation*8),water=t.ground==='water';
  if(water){
    const blue=109+Math.floor(Math.sin(wx*.13+wy*.08)*4);box(c,x,y,s+.5,s+.5,`rgb(83,${blue+32},${blue+30})`);
    const n=[[wx-1,wy,0,0,s*.15,s],[wx+1,wy,s*.85,0,s*.15,s],[wx,wy-1,0,0,s,s*.15],[wx,wy+1,0,s*.85,s,s*.15]];
    for(const [xx,yy,dx,dy,w,h]of n)if(xx>=0&&yy>=0&&xx<MAP_SIZE&&yy<MAP_SIZE&&g.cells[indexOf(xx,yy)].ground!=='water'){box(c,x+dx,y+dy,w,h,'#91b3a0');box(c,x+dx,y+dy,w*.6,h*.6,'#b6c2a0');}
    if(t.variation>.53&&s>10){const phase=Math.sin(now*.0006+wx*.6+wy)*s*.07;c.strokeStyle='#b0d1c488';c.lineWidth=Math.max(1,s*.035);c.beginPath();c.moveTo(x+s*.18,y+s*.47+phase);c.lineTo(x+s*.55,y+s*.47+phase);c.moveTo(x+s*.4,y+s*.74-phase);c.lineTo(x+s*.7,y+s*.74-phase);c.stroke();}
    return;
  }
  const kind=t.ground==='sand'?'sand':t.ground==='forest'?'forest':'grass';
  c.drawImage(texture(kind,variant),x,y,s+.5,s+.5);
  const warmth=(Math.sin(wx*.091)+Math.cos(wy*.077)+Math.sin((wx+wy)*.047))/3;
  c.globalAlpha=Math.abs(warmth)*.09;box(c,x,y,s+.5,s+.5,warmth>0?'#dbc68c':'#355f3e');c.globalAlpha=1;
  if(t.traffic>2){
    const width=s*(.38+Math.min(16,t.traffic)*.018),cx=x+s/2,cy=y+s/2;
    c.save();c.beginPath();c.arc(cx,cy,width*.61,0,7);
    if(wx>0&&g.cells[indexOf(wx-1,wy)].traffic>2)c.rect(x-1,cy-width/2,s/2+1,width);
    if(wx<MAP_SIZE-1&&g.cells[indexOf(wx+1,wy)].traffic>2)c.rect(cx,cy-width/2,s/2+1,width);
    if(wy>0&&g.cells[indexOf(wx,wy-1)].traffic>2)c.rect(cx-width/2,y-1,width,s/2+1);
    if(wy<MAP_SIZE-1&&g.cells[indexOf(wx,wy+1)].traffic>2)c.rect(cx-width/2,cy,width,s/2+1);
    c.clip();c.globalAlpha=Math.min(.95,t.traffic/9);c.drawImage(texture('dirt',variant),x,y,s+.5,s+.5);c.restore();
  }
  if(s>16&&t.ground==='grass'&&t.traffic<2){
    if(t.variation>.95){box(c,x+s*.27,y+s*.58,s*.05,s*.1,'#5c824b');box(c,x+s*.25,y+s*.55,s*.1,s*.055,t.variation>.98?'#e5d99d':'#d3d6ab');}
    else if(t.variation<.045){ellipse(c,x+s*.6,y+s*.7,s*.09,s*.05,'#586d4055');box(c,x+s*.56,y+s*.63,s*.12,s*.055,'#b0b48c');}
  }
}
const treeSprites=new Map<number,HTMLCanvasElement>();
function treeSprite(variant:number){
  if(treeSprites.has(variant))return treeSprites.get(variant)!;
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=128;const c=canvas.getContext('2d')!,r=noise(variant*771+332);
  ellipse(c,50,107,30,10,'#243c282f');ellipse(c,49,104,20,6,'#243c2820');
  box(c,45,65,8,40,'#665337');box(c,46,67,3,37,'#a0844b');polygon(c,[[47,90],[32,70],[35,68],[50,83]],'#75633b');polygon(c,[[51,85],[67,63],[70,65],[52,91]],'#675738');
  if(variant%3===0){
    for(let tier=3;tier>=0;tier--){const yy=15+tier*17,half=14+tier*5;polygon(c,[[48,yy-8],[48-half-3,yy+34],[48+half+3,yy+34]],'#344f34');polygon(c,[[48,yy-8],[48-half,yy+31],[48,yy+26]],tier%2?'#6d8c46':'#7e9850');polygon(c,[[48,yy-8],[48,yy+26],[48+half,yy+31]],'#4d6f3d');for(let j=0;j<8;j++)box(c,48-half+r()*half*1.8,yy+20+r()*10,3,1,'#9bb26855');}
  }else{
    const blobs=[[48,37,26],[28,57,23],[67,55,22],[48,70,27],[37,37,18],[61,33,17]];
    for(const [x,y,rad]of blobs)ellipse(c,x+2,y+5,rad,rad*.88,'#385b35');
    for(const [x,y,rad]of blobs){const grad=c.createRadialGradient(x-rad*.3,y-rad*.35,2,x,y,rad);grad.addColorStop(0,variant%2?'#9ab363':'#a0b66a');grad.addColorStop(.5,variant%2?'#749649':'#799c50');grad.addColorStop(1,'#4f773d');ellipse(c,x,y,rad,rad*.88,grad);}
    for(let j=0;j<110;j++){const x=17+r()*62,y=17+r()*67;if(Math.hypot((x-48)/1.04,y-48)<30){c.globalAlpha=.2+r()*.3;box(c,x,y,2+r()*4,1+r()*2,r()>.5?'#c0c97b':'#305d33');}}c.globalAlpha=1;
  }
  box(c,43,104,3,3,'#a5ad71');box(c,52,103,2,4,'#788b48');treeSprites.set(variant,canvas);return canvas;
}
export function paintTree(c:CanvasRenderingContext2D,x:number,y:number,s:number,variation:number,now:number){const variant=Math.floor(variation*12);const sway=Math.sin(now*.00055+variant)*s*.012;c.drawImage(treeSprite(variant),x-s*.25+sway,y-s*.83,s*1.5,s*2);}
const oreSprites=new Map<string,HTMLCanvasElement>();
export function paintOre(c:CanvasRenderingContext2D,x:number,y:number,s:number,iron:boolean,variation:number){
  const variant=Math.floor(variation*6),key=`${iron}${variant}`;let canvas=oreSprites.get(key);
  if(!canvas){canvas=document.createElement('canvas');canvas.width=80;canvas.height=80;const cx=canvas.getContext('2d')!,r=noise(variant*172+9);ellipse(cx,40,62,34,12,'#283b282f');
    const rocks=[[18,50,14],[47,40,25],[65,54,13],[32,60,13]];
    for(const [rx,ry,sz]of rocks){const points=[[rx-sz,ry],[rx-sz*.7,ry-sz*.65],[rx+sz*.3,ry-sz],[rx+sz,ry-sz*.2],[rx+sz*.7,ry+sz*.4],[rx-sz*.4,ry+sz*.5]];polygon(cx,points,iron?'#71847c':'#8d9987','#62745b');polygon(cx,[points[0],points[1],points[2],[rx+sz*.15,ry]],iron?'#b0b4a0':'#c0c2a5');polygon(cx,[[rx+sz*.15,ry],points[2],points[3],points[4]],iron?'#8b9b8c':'#a4af96');if(iron){cx.strokeStyle='#c4a16b';cx.lineWidth=2;cx.beginPath();cx.moveTo(rx-sz*.2,ry-sz*.45);cx.lineTo(rx+sz*.05,ry-sz*.1);cx.lineTo(rx-sz*.2,ry+sz*.2);cx.stroke();}for(let j=0;j<6;j++)box(cx,rx-sz*.4+r()*sz,ry-sz*.2+r()*sz*.4,2,1,'#d5d6b533');}
    oreSprites.set(key,canvas);
  }
  c.drawImage(canvas,x-s*.12,y-s*.14,s*1.25,s*1.25);
}
function stonework(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,shade=false){
  box(c,x,y,w,h,shade?'#7f8271':'#b3b19b');
  for(let row=0;row<h/6;row++)for(let col=-1;col<w/9;col++){const xx=x+col*9+(row%2)*4.5,yy=y+row*6;const ww=Math.min(8,x+w-xx);if(xx<x||ww<=0)continue;box(c,xx,yy,ww,5,shade?(row+col)%3?'#888b77':'#96957d':(row+col)%3?'#bdbba1':'#cbc5a8');box(c,xx,yy,ww,1,'#e3d7b344');}
}
function windowPane(c:CanvasRenderingContext2D,x:number,y:number,w=7,h=9){box(c,x-1,y-1,w+2,h+2,'#584a35');box(c,x,y,w,h,'#8eaaa2');box(c,x,y,w/2,h/2,'#c0c6ab');box(c,x+w/2,y,1,h,'#d3ba86');box(c,x,y+h/2,w,1,'#d3ba86');box(c,x-3,y-1,2,h+3,'#8b7148');box(c,x+w+1,y-1,2,h+3,'#7a6442');box(c,x-2,y+h+1,w+4,2,'#c9b184');}
function barrel(c:CanvasRenderingContext2D,x:number,y:number,sz=9){ellipse(c,x+sz/2,y+sz*.78,sz*.59,sz*.24,'#483e2c33');box(c,x,y+2,sz,sz*.9,'#8d693e');box(c,x+2,y+2,sz*.3,sz*.9,'#b38c50');box(c,x,y+sz*.35,sz,1,'#544e3e');box(c,x,y+sz*.8,sz,1,'#544e3e');ellipse(c,x+sz/2,y+2,sz/2,2,'#ccb17b');ellipse(c,x+sz/2,y+1,sz*.35,1,'#a28759');}
function banner(c:CanvasRenderingContext2D,x:number,y:number,height:number,color:string,now:number){box(c,x,y-height,1.6,height,'#d4c69c');ellipse(c,x+.7,y-height,1.8,1.8,'#dbc08b');const w=9+Math.sin(now*.002)*1.2;polygon(c,[[x+2,y-height+2],[x+w,y-height+3],[x+w-2,y-height+9],[x+2,y-height+8]],color,'#32493577');box(c,x+3,y-height+3,w-5,1,'#f3e2b455');}
function roof(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,material:'clay'|'slate'|'thatch',seed:number){
  const colors=material==='clay'?['#9c593e','#bb7651','#d79b69']:material==='slate'?['#445951','#63766b','#94a393']:['#8a7545','#ad9458','#cdb47a'];
  const points=[[x-3,y+h*.39],[x+w*.48,y-h*.18],[x+w+4,y+h*.39]];
  polygon(c,[[x+3,y+h*.37],[x+w*.48,y-h*.18],[x+w+7,y+h*.32],[x+w+4,y+h*.47]],'#4b4933');
  polygon(c,points,colors[1],'#574c35');
  c.save();c.beginPath();points.forEach(([xx,yy],i)=>i?c.lineTo(xx,yy):c.moveTo(xx,yy));c.closePath();c.clip();
  for(let row=-5;row<Math.ceil(h*.6/4);row++)for(let col=-2;col<w/7+3;col++){
    const xx=x+col*7+(row%2)*3.5,yy=y-h*.18+row*4;box(c,xx,yy,6,3,(col+row+seed)%4===0?colors[2]:colors[1]);box(c,xx,yy+3,7,1,colors[0]);if(material==='thatch')box(c,xx+2,yy,1,4,'#dcc18155');
  }
  c.globalAlpha=.27;polygon(c,[[x+w*.48,y-h*.18],[x+w+4,y+h*.39],[x+w*.48,y+h*.39]],'#172c27');c.globalAlpha=1;c.restore();
  box(c,x-3,y+h*.39,w+7,2,'#564d35');box(c,x-2,y+h*.39,w+5,1,colors[2]);
}
function cottage(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,material:'clay'|'slate'|'thatch',seed:number){
  stonework(c,x+4,y+h*.74,w-6,h*.24);box(c,x+4,y+h*.29,w-6,h*.49,'#d2c49e');box(c,x+w*.76,y+h*.3,w*.19,h*.5,'#a89e7b');
  const r=noise(seed);for(let i=0;i<50;i++)box(c,x+5+r()*(w-9),y+h*.4+r()*h*.35,1,1,'#7c714322');
  for(const dx of [.1,.47,.76])box(c,x+w*dx,y+h*.37,2,h*.4,'#78613f');box(c,x+4,y+h*.66,w-6,2,'#8c7146');
  roof(c,x,y,w,h,material,seed);
  const dw=w*.15,dh=h*.33,doorX=x+w*.48-dw/2,doorY=y+h*.48;
  box(c,doorX-2,doorY-2,dw+4,dh+3,'#b09a69');box(c,doorX,doorY,dw,dh,'#554a34');box(c,doorX+2,doorY+1,dw*.4,dh-2,'#7c6340');box(c,doorX+dw-3,doorY+dh*.6,1.3,1.3,'#d6bb77');box(c,doorX-4,doorY+dh,dw+8,3,'#c5bea0');
  windowPane(c,x+w*.15,y+h*.49,Math.max(5,w*.12),h*.14);if(w>60)windowPane(c,x+w*.7,y+h*.49,Math.max(5,w*.1),h*.14);
}
export function paintBuilding(c:CanvasRenderingContext2D,b:Building,x:number,y:number,s:number,color:string,now:number,ghost=false){
  c.save();c.translate(x,y);c.scale(s/32,s/32);const d=CATALOG[b.kind],w=d.width*32,h=d.height*32;
  ellipse(c,w*.56,h*.85,w*.58,h*.25,'#273c2930');ellipse(c,w*.57,h*.87,w*.46,h*.16,'#273c2918');
  if(!b.complete&&!ghost){
    stonework(c,2,7,w-4,h-10);box(c,5,10,w-10,h-17,'#a08d63');
    for(let xx=7;xx<w;xx+=14){box(c,xx,3,2,h-4,'#705939');box(c,xx-1,4,1,h-8,'#d0ad70');}
    for(let yy=12;yy<h;yy+=13){box(c,4,yy,w-8,2,'#bd9a60');box(c,4,yy+2,w-8,1,'#665435');}
    c.strokeStyle='#91764b';c.lineWidth=1;c.beginPath();c.moveTo(6,8);c.lineTo(w-7,h-7);c.moveTo(w-7,8);c.lineTo(6,h-7);c.stroke();
    if(b.progress>.45){c.globalAlpha=(b.progress-.35)*.8;cottage(c,3,0,w-6,h*.86,'thatch',b.id);c.globalAlpha=1;}
    box(c,4,h-5,17,4,'#957346');box(c,4,h-5,17,1,'#d6ba7b');barrel(c,w-13,h-13,8);
    box(c,0,h+4,w,4,'#393f2e');box(c,1,h+5,(w-2)*b.progress,2,'#ccb169');c.restore();return;
  }
  if(b.kind==='farm'){
    box(c,0,1,w,h-3,'#79623d');box(c,3,4,w-6,h-9,'#977b44');
    for(let row=0;row<5;row++){
      const yy=8+row*(h-14)/5;box(c,5,yy+5,w-10,3,'#675736');
      for(let k=0;k<11;k++){const xx=8+k*(w-16)/11;box(c,xx,yy,1,8,'#aab070');box(c,xx-1,yy-1,3,4,'#d8bd64');box(c,xx-2,yy,5,1,'#e4d18c');}
    }
    for(let xx=1;xx<w;xx+=12){box(c,xx,0,2,9,'#aa9463');box(c,xx,h-8,2,9,'#8c784e');}box(c,0,h-4,w,1,'#b9a270');
    cottage(c,w-24,-4,24,28,'thatch',b.id);barrel(c,w-13,h-14,8);c.restore();return;
  }
  if(b.kind==='watchtower'){
    stonework(c,14,-11,w-27,h+1);stonework(c,w*.58,-11,9,h+1,true);box(c,12,-13,w-23,10,'#cbc4a6');
    for(let k=0;k<4;k++)stonework(c,12+k*10,-21,7,11);box(c,13,-4,w-25,2,'#746f56');
    box(c,27,13,7,15,'#4a5141');box(c,28,14,2,13,'#333d33');box(c,23,h*.65,13,h*.29,'#6f5a39');
    banner(c,47,-10,23,color,now);c.restore();return;
  }
  if(b.kind==='mine'||b.kind==='quarry'){
    const iron=b.kind==='mine';polygon(c,[[0,h*.76],[4,25],[21,10],[w-12,7],[w+1,34],[w-2,h*.8]],iron?'#839181':'#a2aa94','#697859');
    polygon(c,[[4,25],[21,10],[w-12,7],[w*.6,27],[25,35]],iron?'#b1b6a1':'#c1c4a6');polygon(c,[[w*.6,27],[w-12,7],[w+1,34],[w-2,h*.8]],'#6f7d68');
    box(c,23,28,22,27,'#313e32');box(c,19,24,30,5,'#a78b55');box(c,20,28,4,29,'#c2a369');box(c,44,28,4,29,'#867146');box(c,18,22,32,2,'#d1b477');
    box(c,25,47,3,16,'#9e8963');box(c,39,47,3,16,'#9e8963');for(let k=0;k<4;k++)box(c,24,49+k*4,19,1,'#544b35');
    for(let k=0;k<4;k++)polygon(c,[[3+k*8,h-5],[6+k*8,h-12],[12+k*8,h-10],[13+k*8,h-4]],iron?'#7f8e81':'#b6baa0');
    if(iron){box(c,w-14,30,12,21,'#776c50');box(c,w-12,35,8,10,'#403f31');box(c,w-11,40,6,4,'#c28649');box(c,w-10,41,3,2,'#e1ba6b');}c.restore();return;
  }
  if(b.kind==='hall'){
    cottage(c,1,10,w-3,h*.78,'slate',b.id);
    stonework(c,w*.36,-3,w*.3,h*.62);stonework(c,w*.59,-3,w*.08,h*.62,true);
    roof(c,w*.31,-6,w*.39,h*.48,'slate',b.id);windowPane(c,w*.455,18,8,11);
    box(c,w*.43,h*.5,w*.15,h*.31,'#6e5d3d');box(c,w*.46,h*.51,w*.08,h*.29,'#403c2e');
    stonework(c,w*.34,h*.79,w*.34,7);box(c,w*.33,h*.86,w*.36,3,'#d2c5a2');
    banner(c,w*.69,-9,30,color,now);box(c,w*.18,h*.52,4,11,color);box(c,w*.75,h*.52,4,11,color);barrel(c,w-13,h*.78,8);c.restore();return;
  }
  if(b.kind==='lumber'){
    cottage(c,0,0,w*.83,h*.7,'thatch',b.id);
    for(let row=0;row<3;row++){box(c,5,h*.68+row*5,w*.65,5,'#755735');box(c,5,h*.68+row*5,w*.65,1,'#c8a66d');ellipse(c,7,h*.7+row*5,3,2,'#d2b57f');ellipse(c,7,h*.7+row*5,1.5,1,'#a78653');}
    box(c,w-10,h*.42,3,h*.49,'#9f8451');box(c,w-16,h*.5,15,2,'#7e6b43');box(c,w-16,h*.63,15,2,'#b59a66');
    polygon(c,[[w-14,h*.4],[w-7,h*.37],[w-3,h*.43],[w-9,h*.48]],'#b5bba0');c.restore();return;
  }
  if(b.kind==='barracks'){
    cottage(c,1,2,w-3,h*.85,'clay',b.id);banner(c,w*.85,14,27,color,now);
    for(let j=0;j<4;j++){box(c,9+j*5,h*.68,1,16,'#6b603d');polygon(c,[[7+j*5,h*.68],[9.5+j*5,h*.6],[12+j*5,h*.68]],'#b7c0a7');}
    box(c,w*.59,h*.74,14,4,'#947044');polygon(c,[[w*.63,h*.45],[w*.76,h*.45],[w*.76,h*.65],[w*.695,h*.74],[w*.63,h*.65]],color,'#c9b781');c.restore();return;
  }
  cottage(c,1,2,w-2,h*.85,b.kind==='store'?'slate':b.id%3===0?'clay':'thatch',b.id);
  if(b.kind==='store'){
    for(let j=0;j<2;j++){box(c,4+j*11,h*.75,10,10,'#a6824a');box(c,5+j*11,h*.76,8,1,'#dbc088');box(c,9+j*11,h*.75,1,10,'#71583a');}barrel(c,w-11,h*.7,9);
  }else{
    stonework(c,w*.7,-1,7,h*.29,true);box(c,w*.69,-3,9,3,'#c8bda0');
    if(!ghost){for(let puff=0;puff<3;puff++){const phase=(now*.00013+b.id*.17+puff/3)%1;c.globalAlpha=(1-phase)*.24;ellipse(c,w*.74+Math.sin(phase*5)*5,-6-phase*28,2+phase*5,2+phase*6,'#ded8be');}c.globalAlpha=1;}
    if(b.level>1)box(c,w*.25,h*.78,11,4,'#718754');
  }
  c.restore();
}
export function paintResourceIcon(c:CanvasRenderingContext2D,kind:Resource,width:number,height:number){
  c.clearRect(0,0,width,height);c.save();c.translate((width-32)/2,(height-32)/2);
  if(kind==='wood'){for(let j=2;j>=0;j--){box(c,6+j*4,7+j*6,20,6,'#805331');box(c,6+j*4,7+j*6,20,2,'#bd8b4e');ellipse(c,7+j*4,10+j*6,4,4,'#dfb77c');ellipse(c,7+j*4,10+j*6,2,2,'#ac7d48');}}
  if(kind==='stone'||kind==='iron'){polygon(c,[[2,23],[5,10],[17,3],[28,10],[30,24],[16,29]],kind==='iron'?'#657f7b':'#a0aa9c','#4a5a4e');polygon(c,[[5,10],[17,3],[24,12],[13,17]],kind==='iron'?'#a5b7aa':'#d1d1b6');polygon(c,[[13,17],[24,12],[28,10],[30,24],[16,29]],kind==='iron'?'#82968c':'#aab4a1');if(kind==='iron'){box(c,17,15,3,6,'#c29b61');box(c,9,20,3,3,'#c29b61');}}
  if(kind==='food'){c.strokeStyle='#bb9555';c.lineWidth=2;for(let j=0;j<3;j++){c.beginPath();c.moveTo(11+j*3,29);c.lineTo(9+j*7,3);c.stroke();for(let k=0;k<4;k++){ellipse(c,7+j*7,5+k*4,2,3,'#e1c474');ellipse(c,11+j*7,7+k*4,2,3,'#bd9f55');}}box(c,11,23,10,3,'#957643');}
  c.restore();
}
