import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenToWorld,worldToScreen,type Camera} from '../src/settlement-render.ts';
test('HUD camera offsets keep rendering and input coordinates aligned',()=>{for(const [width,height]of [[390,844],[1044,884],[1920,1080]])for(const zoom of [2,16,32,48]){const c:Camera={x:118.5,y:124.5,zoom,offsetX:width>900?-150:0,offsetY:-8};for(const [x,y]of [[118.5,124.5],[116,119],[128,128],[0,255]]){const screen=worldToScreen(x,y,width,height,c),back=screenToWorld(screen.x,screen.y,width,height,c);assert.ok(Math.abs(back.x-x)<1e-9);assert.ok(Math.abs(back.y-y)<1e-9);}}});
test('the focused village sits in the unobscured part of the playfield',()=>{const c:Camera={x:118.5,y:124.5,zoom:32,offsetX:-150,offsetY:-8};const p=worldToScreen(118.5,124.5,1044,884,c);assert.equal(p.x,372);assert.equal(p.y,434);assert.ok(p.x<1044-302);});
