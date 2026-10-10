// Mobile screenshot regression: QA methods exist ONLY in a temporary copy.
import { chromium } from 'playwright';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
const root=process.cwd(),dest=path.resolve(process.env.EPIC_SCREENSHOT_DIR||'qa-screenshots');
const temp=await mkdtemp(path.join(os.tmpdir(),'epic-qa-'));let browser,server;
const qa="\n  qaGoTo(levelKey,roomId) {\n    this.#gateUI.hide();\n    if (this.#dialogue.isActive) this.#dialogue.hide();\n    this.#deps.gateSystem.cancel();\n    this.#worldState = {};\n    this.#loadLevel(levelKey,roomId);\n    this.#abilities.reset(true);\n    this.#player.reviveFromCheckpoint();\n  }\n  qaShowGate() {\n    const r = this.#level.currentRoom;\n    if (!r.gate) return false;\n    this.#player.x = r.gate.x; this.#player.y = r.gate.y;\n    if (!this.#deps.gateSystem.approach(r.gate,this.#level.levelNumber)) return false;\n    this.#gateUI.show(); return this.#gateUI.visible;\n  }\n  qaOpenGate() {\n    this.#gateUI.hide();\n    this.#deps.gateSystem.cancel();\n    this.#level.currentRoom.openGate();\n  }\n  qaTalk() {\n    const npc=this.#level.currentRoom.npcs[0];\n    if (!npc) return false;\n    this.#player.x=npc.x;this.#player.y=npc.y;\n    npc.update(0,this.#player);npc.interact(this.#deps.eventBus);\n    return this.#dialogue.isActive;\n  }\n  qaBossPhase(p) {\n    const b=this.#level.currentRoom.enemies.find(e=>e.isBoss);\n    if (!b) return false;\n    b.hp=Math.round(b.maxHP*(p===1?.94:p===2?.55:.23));\n    b.update(0,this.#player,this.#deps.fearSystem,this.#deps.skillTree,this.#level.currentRoom.tilemap);\n    return true;\n  }\n  qaSkillCount(target) {\n    const tree=this.#deps.skillTree;\n    while(tree.getActiveSkillCount()>target) {\n      const options=tree.getRemovableSkills('choice');\n      if(!options.length)break;\n      tree.removeSkill(options[0].id,this.#level.levelNumber);\n    }\n  }\n  qaAbility(skillId) {\n    const room=this.#level.currentRoom;\n    const target=room.enemies.find(e=>e.isAlive);\n    if (target) {\n      this.#player.x=target.x-36; this.#player.y=target.y;\n      this.#player.facingX=1;this.#player.facingY=0;\n    }\n    this.#player.mana=100;\n    this.#player.stamina=100;\n    return this.#abilities.use(skillId);\n  }\n  qaDie() {this.#player.hp=0;this.#player.isAlive=false;}\n";
const errors=[], images=[];
async function pause(ms){return new Promise(r=>setTimeout(r,ms));}
try{
  await mkdir(dest,{recursive:true});
  const folder=path.join(temp,'game');
  await cp(root,folder,{recursive:true,filter:p=>!p.split(path.sep).includes('node_modules')&&!p.split(path.sep).includes('qa-screenshots')});
  const filename=path.join(folder,'src/ui/GameScene.js');
  let code=await readFile(filename,'utf8');
  const init='    this.#saveCheckpoint();\n  }\n\n  // Загрузка/смена уровня.';
  if(!code.includes(init)||!code.includes('  #announceLevel(levelKey) {')||!code.includes('  destroy() {'))
    throw Error('QA hooks could not be installed: source changed');
  code=code.replace(init,'    this.#saveCheckpoint();\n    window.__epicQA=this;\n  }\n\n  // Загрузка/смена уровня.');
  code=code.replace('  #announceLevel(levelKey) {',"  #announceLevel(levelKey) {\n    if (new URLSearchParams(location.search).has('qa')) return;");
  code=code.replace('  destroy() {',qa+'\n  destroy() {');
  await writeFile(filename,code);
  const port=4173,url='http://127.0.0.1:'+port+'/index.html?debug&qa=quiet';
  server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',folder],{stdio:'pipe'});
  let ready=false;
  for(let i=0;i<80;i++){try{const r=await fetch(url);if(r.ok){ready=true;break;}}catch{}await pause(100);}
  if(!ready)throw Error('Test server did not start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(()=>Boolean(window.__epicQA)&&!document.getElementById('loading-screen'),null,{timeout:20000});
  if(!await page.locator('#mobile-controls').evaluate(el=>el.classList.contains('visible')))throw Error('Mobile controls not visible');
  async function snap(name){await pause(120);await page.screenshot({path:path.join(dest,name+'.png')});images.push(name+'.png');}
  async function go(l,id){await page.evaluate(({l,id})=>window.__epicQA.qaGoTo(l,id),{l,id});}
  await snap('00-mobile-landscape');
  await page.locator('#settings-open').click();
  if(!await page.locator('#settings-panel').isVisible())throw Error('Settings not visible');
  // Проверяем реальный UI mute toggle, включая сохранение настройки.
  const soundToggle = page.locator('#settings-sound-toggle');
  if(!await soundToggle.isChecked()) throw Error('Sound should be enabled by default');
  await soundToggle.uncheck();
  if(await page.evaluate(()=>localStorage.getItem('epic_refund_sound'))!=='false')
    throw Error('Mute preference not persisted');
  await soundToggle.check();
  if(await page.evaluate(()=>localStorage.getItem('epic_refund_sound'))!=='true')
    throw Error('Unmute preference not persisted');
  await snap('01-mobile-settings');
  await page.locator('#settings-fullscreen').click();
  const fullscreen = await page.evaluate(() => ({
    active: Boolean(document.fullscreenElement),
    message: document.querySelector('#settings-status').textContent.trim(),
  }));
  if (!fullscreen.active && !fullscreen.message) throw Error('Fullscreen control gave no result');
  await snap('02-fullscreen-toggle');
  if (fullscreen.active) await page.locator('#settings-fullscreen').click();
  await page.locator('#settings-close').click();
  for(const [level,n] of [['level_01',6],['level_02',7],['level_03',8]]){
    for(let i=1;i<=n;i++){
      const id='l'+Number(level.slice(-2))+'_room_'+String(i).padStart(2,'0');
      await go(level,id);await snap('room-'+id);
    }
  }
  for(const [level,id] of [['level_01','l1_room_04'],['level_02','l2_room_04'],
   ['level_02','l2_room_06'],['level_03','l3_room_03'],['level_03','l3_room_07']]){
    await go(level,id);
    if(!await page.evaluate(()=>window.__epicQA.qaShowGate()))throw Error('Gate cannot be shown: '+id);
    if(!await page.locator('#mobile-gate-nav').evaluate(el=>el.classList.contains('gate-nav-visible')))throw Error('Mobile Gate navigation missing: '+id);
    if(!await page.locator('#mobile-controls').evaluate(el=>el.classList.contains('gate-active')))throw Error('Mobile combat controls still active during gate: '+id);
    await snap('gate-'+id+'-select');
    await page.evaluate(()=>window.__epicQA.qaOpenGate());
    if(await page.locator('#mobile-gate-nav').evaluate(el=>el.classList.contains('gate-nav-visible')))throw Error('Mobile Gate navigation remains after closing: '+id);
    await snap('gate-'+id+'-open');
  }
  await go('level_01','l1_room_06');
  for(const p of [1,2,3]){await page.evaluate(p=>window.__epicQA.qaBossPhase(p),p);await snap('boss-phase-'+p);}
  await go('level_02','l2_room_01');
  if(await page.evaluate(()=>window.__epicQA.qaTalk())){
    if(!await page.locator('#mobile-controls').evaluate(el=>el.classList.contains('dialogue-active')))throw Error('Combat controls not hidden in dialogue');
    if(await page.locator('#move-pad').isVisible())throw Error('Joystick still covers dialogue');
    if(!await page.locator('#mobile-actions [data-action="interact"]').isVisible())throw Error('Interact should stay visible');
    await snap('dialogue-gribl');
  }
  // Проверяем настоящий touch-tap на кнопке навыка, не только QA-вызов use().
  await go('level_01','l1_room_02');
  await page.locator('#mobile-skills [data-action="skill2"]').tap();
  await page.waitForTimeout(220);
  const cooldownText = await page.locator('#mobile-skills [data-action="skill2"]').textContent();
  if(!/^\d+$/.test(cooldownText)) throw Error('Touch fireball did not start cooldown: '+cooldownText);
  await snap('ability-touch-fireball-cooldown');

  for(const skillId of ['str_t3','mag_t2','agi_t3','str_t4','mag_t4','def_t4','agi_t4','aur_t4']){
    await go('level_01','l1_room_02');
    const success=await page.evaluate(id=>window.__epicQA.qaAbility(id),skillId);
    if(!success)throw Error('Skill failed to cast during mobile QA: '+skillId);
    await snap('ability-'+skillId);
  }
  // End-to-end: настоящие сенсорные нажатия, а не прямые вызовы sacrifice().
  await go('level_01','l1_room_04');
  if(!await page.evaluate(()=>window.__epicQA.qaShowGate())) throw Error('Cannot open Gate for touch-confirm QA');
  const sacrificeBtn = page.locator('#mobile-gate-nav [data-action="interact"]');
  await sacrificeBtn.tap();
  await page.waitForTimeout(120);
  const remainingAfterFirst=await page.evaluate(()=>window.game.debug.getSkillTree().getActiveSkillCount());
  if(remainingAfterFirst!==20) throw Error('First touch incorrectly sacrificed a skill');
  await snap('gate-mobile-confirmation');
  await sacrificeBtn.tap();
  await page.waitForTimeout(120);
  const remainingAfterSecond=await page.evaluate(()=>window.game.debug.getSkillTree().getActiveSkillCount());
  if(remainingAfterSecond!==19) throw Error('Second touch failed to sacrifice');
  if(await page.locator('#mobile-gate-nav').evaluate(el=>el.classList.contains('gate-nav-visible')))
    throw Error('Gate nav stayed open after sacrifice');

  await go('level_02','l2_room_01');
  for(const n of [16,11,6,2,0]){await page.evaluate(n=>window.__epicQA.qaSkillCount(n),n);await snap('hud-'+n+'-skills');}
  await page.evaluate(()=>window.__epicQA.qaDie());await snap('player-death');
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.__epicQA)&&!document.getElementById('loading-screen'),null,{timeout:20000});
  await snap('mobile-portrait');
  await page.locator('#settings-open').click();await snap('settings-portrait');
  await page.locator('#settings-close').click();
  await writeFile(path.join(dest,'manifest.json'),JSON.stringify({
    note:'QA teleports: screenshots prove UI renders but NOT full playthrough',
    screenshotCount:images.length,images,errors
  },null,2));
  console.log('Captured',images.length,'screenshots;',errors.length,'JavaScript errors');
  if(errors.length){console.error(errors);process.exitCode=1;}
}finally{
  if(browser)await browser.close();
  if(server)server.kill();
  await rm(temp,{recursive:true,force:true});
}
