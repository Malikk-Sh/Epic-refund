// Декорации Hexed Prison: рисуются по координате основания (foot Y).
// Игровая физика остаётся в Tilemap, художественный 3/4 слой не меняет хитбоксы.
const TAU = Math.PI * 2;
const STONE = '#35343a', EDGE = '#746b63', DARK = '#15131a', GOLD = '#b6955c';
const px = (ctx,c,x,y,w,h)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h);};
function glow(ctx,x,y,r,color) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'rgba(255,114,26,0)');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function flame(ctx,time,offset=0) {
  const flick=Math.sin(time*11+offset)*1.4;
  px(ctx,'#ff4b1e',-4,-22+flick,8,12);
  px(ctx,'#ff9a26',-3,-21+flick,6,10);
  px(ctx,'#fff0a5',-1.5,-17+flick,3,7);
  px(ctx,'#ffae37',1,-26+flick,2,10);
}
function column(ctx) {
  px(ctx,'rgba(0,0,0,.48)',-12,-2,24,6);
  px(ctx,'#171720',-10,-27,20,28);
  px(ctx,STONE,-9,-28,18,25);
  px(ctx,'#66605d',-11,-30,22,6);
  px(ctx,DARK,-10,-34,20,5);
  px(ctx,EDGE,-10,-35,20,2);
  px(ctx,'#5b3135',-6,-24,12,20);
  px(ctx,'#a92e3c',-4,-23,8,16);
  px(ctx,GOLD,-1,-21,2,12);
  px(ctx,GOLD,-4,-17,8,2);
  px(ctx,'#14151c',-12,-5,24,5);
  px(ctx,EDGE,-12,-6,24,2);
}
function brazier(ctx,t,offset) {
  glow(ctx,0,-17,30,'rgba(255,127,29,.38)');
  px(ctx,'rgba(0,0,0,.5)',-9,0,18,4);
  px(ctx,'#31272a',-2,-14,4,16);
  px(ctx,'#7a6260',-5,-7,10,3);
  flame(ctx,t,offset);
  px(ctx,DARK,-8,-16,16,3);
  px(ctx,'#ba6e36',-7,-16,14,1.5);
  for(const x of [-7,-3,3,7])px(ctx,'#2a2525',x,-20,2,7);
}
function bars(ctx) {
  px(ctx,'#0c0e14',-14,-35,28,31);
  px(ctx,'#5b5350',-14,-35,28,3);
  for(let x=-11;x<=11;x+=6)px(ctx,'#77716b',x,-33,2,29);
  px(ctx,'#9b825c',-13,-26,26,2);
  px(ctx,'#51494a',-13,-11,26,3);
  px(ctx,'rgba(0,0,0,.4)',-15,-3,30,5);
}
function statue(ctx) {
  px(ctx,'rgba(0,0,0,.5)',-15,0,30,5);
  px(ctx,'#4d4749',-13,-9,26,9);
  px(ctx,EDGE,-13,-10,26,2);
  px(ctx,'#692b35',-8,-9,16,8);
  px(ctx,'#77716c',-8,-25,16,17);
  px(ctx,'#51484d',-13,-27,7,17);
  px(ctx,'#51484d',6,-27,7,17);
  px(ctx,'#aba396',-5,-32,10,9);
  px(ctx,DARK,-3,-28,2,2);px(ctx,DARK,2,-28,2,2);
  px(ctx,GOLD,-1,-12,2,7);
}
function crate(ctx) {
  px(ctx,'rgba(0,0,0,.48)',-11,0,22,4);
  px(ctx,'#3b2723',-10,-15,20,15);
  px(ctx,'#80563d',-9,-14,18,12);
  px(ctx,'#362b27',-2,-14,4,12);
  px(ctx,'#c59762',-9,-13,18,2);
  px(ctx,'#3d3330',-9,-4,18,2);
}
function candles(ctx,t) {
  glow(ctx,0,-12,25,'rgba(255,152,57,.19)');
  [-7,0,7].forEach((x,i)=>{
    const h=[8,13,6][i];
    px(ctx,'#b9a18a',x-2,-h,4,h);
    px(ctx,'#f6e1b1',x-1,-h,2,h-2);
    px(ctx,'#ffbf51',x-1,-h-4+Math.sin(t*8+i),2,4);
  });
}
function gate(ctx) {
  px(ctx,'#282329',-19,-43,38,43);
  px(ctx,EDGE,-20,-45,40,5);
  px(ctx,'#a44627',-13,-37,26,31);
  px(ctx,'#1a1820',-13,-38,26,38);
  for(let x=-10;x<=10;x+=5)px(ctx,'#75645e',x,-38,2,38);
  px(ctx,'#9f7856',-12,-17,25,4);
  px(ctx,'#40353c',-13,-31,26,3);
  px(ctx,GOLD,-2,-20,4,6);
  px(ctx,'#6f303a',-26,-35,6,30);
  px(ctx,'#6f303a',20,-35,6,30);
}
export function drawPrisonFloor(ctx,room,cam,time=0) {
  const props=room.presentation?.props??[];
  const ts=room.tilemap.tileSize;
  for(const p of props) {
    if(!['grate','rune','stain'].includes(p.type))continue;
    const center=cam.worldToScreen((p.col+.5)*ts,(p.row+.5)*ts);
    const s=cam.zoom,sy=cam.zoom*cam.pitch;
    ctx.save();ctx.translate(center.x,center.y);
    if(p.type==='grate'){
      px(ctx,'#15131b',-ts*s*.43,-ts*sy*.39,ts*s*.86,ts*sy*.78);
      ctx.strokeStyle='#705a49';ctx.lineWidth=Math.max(1,s);
      for(let i=-2;i<=2;i++) {
        const x=i*ts*s*.12;
        ctx.beginPath();ctx.moveTo(x,-ts*sy*.36);ctx.lineTo(x,ts*sy*.36);ctx.stroke();
      }
    }else if(p.type==='rune'){
      ctx.strokeStyle='rgba(178,64,64,.5)';ctx.lineWidth=1.4*s;
      ctx.beginPath();ctx.ellipse(0,0,ts*s*.46,ts*sy*.44,0,0,TAU);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-ts*s*.26,0);ctx.lineTo(ts*s*.26,0);
      ctx.moveTo(0,-ts*sy*.25);ctx.lineTo(0,ts*sy*.25);ctx.stroke();
    }else {
      ctx.fillStyle='rgba(74,29,31,.38)';ctx.beginPath();
      ctx.ellipse(0,0,ts*s*.36,ts*sy*.24,0,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
}
export function drawPrisonProp(ctx,prop,tilemap,cam,time=0) {
  const {x,y}=cam.worldToScreen((prop.col+.5)*tilemap.tileSize,
    (prop.row+.78)*tilemap.tileSize);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.scale(cam.zoom*.88,cam.zoom*.88);
  switch(prop.type){
    case 'pillar':column(ctx);break;
    case 'brazier':brazier(ctx,time,prop.col);break;
    case 'torch':brazier(ctx,time,prop.col);break;
    case 'bars':bars(ctx);break;
    case 'gargoyle':statue(ctx);break;
    case 'crate':crate(ctx);break;
    case 'candles':candles(ctx,time);break;
    case 'doorArch':gate(ctx);break;
  }
  ctx.restore();
}
export function prisonTallProps(room) {
  return (room.presentation?.props??[]).filter(p=>!['grate','rune','stain'].includes(p.type));
}
