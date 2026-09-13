from pathlib import Path

root = Path('.')
render_path = root / 'src/game/render.ts'
index_path = root / 'index.html'

text = render_path.read_text()

old = """  ctx.fillStyle='rgba(8,20,26,.78)';ctx.fillRect(3,3,Math.min(p.maxHp,10)*14+10,22);
  ctx.strokeStyle='rgba(244,208,63,.25)';ctx.strokeRect(3.5,3.5,Math.min(p.maxHp,10)*14+9,21);"""
new = """  const hpPanelW = Math.min(p.maxHp, 10) * 14 + 12;
  ctx.save();
  ctx.fillStyle = 'rgba(15,38,40,.88)';
  ctx.beginPath(); ctx.roundRect(3, 3, hpPanelW, 23, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(211,178,105,.36)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(3.5, 3.5, hpPanelW - 1, 22, 5.5); ctx.stroke();
  ctx.fillStyle = 'rgba(255,244,218,.055)';
  ctx.beginPath(); ctx.roundRect(6, 5, Math.max(8, hpPanelW - 12), 4, 2); ctx.fill();
  ctx.restore();"""
if old not in text: raise SystemExit('health panel marker missing')
text = text.replace(old, new, 1)

old = """  const cw=100;
  ctx.fillStyle='rgba(8,20,26,.78)';ctx.fillRect(376,4,cw,38);
  drawItemIcon(ctx,380,4,'crumb',16);text(ctx,'MIGAJAS',399,14,6,'#899f98','left');
  text(ctx,`${p.crumbs}`,468,17,10,'#e8c99b','right',true);
  drawItemIcon(ctx,380,22,'golden_crumb',16);text(ctx,'DORADAS',399,32,6,'#ac9a65','left');
  text(ctx,`${engine.totalGoldenCrumbs}`,468,36,10,'#f4d03f','right',true);"""
new = """  const cw=100;
  ctx.save();
  ctx.fillStyle='rgba(15,38,40,.88)';ctx.beginPath();ctx.roundRect(376,4,cw,39,6);ctx.fill();
  ctx.strokeStyle='rgba(211,178,105,.26)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(376.5,4.5,cw-1,38,5.5);ctx.stroke();
  ctx.fillStyle='rgba(211,178,105,.28)';ctx.fillRect(383,22,86,1);
  ctx.restore();
  drawItemIcon(ctx,380,4,'crumb',16);text(ctx,'MIGAJAS',399,14,6,'#9bb0aa','left');
  text(ctx,`${p.crumbs}`,468,17,10,'#ead5a8','right',true);
  drawItemIcon(ctx,380,22,'golden_crumb',16);text(ctx,'DORADAS',399,32,6,'#b6a371','left');
  text(ctx,`${engine.totalGoldenCrumbs}`,468,36,10,'#e8c86d','right',true);"""
if old not in text: raise SystemExit('coins panel marker missing')
text = text.replace(old, new, 1)

old = """  // --- Piso ---
  text(ctx,`PISO ${engine.map.floorIndex+1}/${TOTAL_FLOORS}`,240,12,7,'#d3c999','center',true);
  text(ctx,FLOOR_NAMES_ES[engine.map.floorIndex],240,23,6.5,'#829c98');"""
new = """  // --- Piso ---
  ctx.save();
  ctx.fillStyle='rgba(15,38,40,.76)';ctx.beginPath();ctx.roundRect(196,4,88,25,7);ctx.fill();
  ctx.strokeStyle='rgba(211,178,105,.22)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(196.5,4.5,87,24,6.5);ctx.stroke();
  ctx.restore();
  text(ctx,`PISO ${engine.map.floorIndex+1}/${TOTAL_FLOORS}`,240,12,7,'#e5d1a1','center',true);
  text(ctx,FLOOR_NAMES_ES[engine.map.floorIndex],240,23,6.5,'#93aaa4');"""
if old not in text: raise SystemExit('floor panel marker missing')
text = text.replace(old, new, 1)

old = """  ctx.fillStyle='rgba(8,20,26,.7)';ctx.fillRect(6,40,74,16);
  text(ctx,`ALERTA ${Math.round(engine.alert)}`,10,48,6.5,'#d4b47c','left',true);
  ctx.fillStyle='#1a2c32';ctx.fillRect(10,51,66,4);ctx.fillStyle='#c78868';ctx.fillRect(10,51,66*engine.alert/100,4);"""
new = """  ctx.save();
  ctx.fillStyle='rgba(15,38,40,.72)';ctx.beginPath();ctx.roundRect(6,40,76,18,5);ctx.fill();
  ctx.strokeStyle='rgba(211,178,105,.15)';ctx.beginPath();ctx.roundRect(6.5,40.5,75,17,4.5);ctx.stroke();
  ctx.restore();
  text(ctx,`ALERTA ${Math.round(engine.alert)}`,11,48,6.5,'#d5bb86','left',true);
  ctx.fillStyle='#223b3e';ctx.fillRect(11,52,66,3);ctx.fillStyle=engine.alert>70?'#c96e5f':'#b88b59';ctx.fillRect(11,52,66*engine.alert/100,3);"""
if old not in text: raise SystemExit('alert panel marker missing')
text = text.replace(old, new, 1)

text = text.replace("on ? 'rgba(22,26,40,0.95)' : 'rgba(8,10,18,0.8)'", "on ? 'rgba(20,50,52,0.95)' : 'rgba(12,30,33,0.84)'", 1)
text = text.replace("on ? '#f4d03f' : '#2f3644'", "on ? '#d6b66a' : '#365356'", 1)
text = text.replace("ctx.shadowColor = 'rgba(244,208,63,0.55)';", "ctx.shadowColor = 'rgba(214,182,106,0.38)';", 1)
text = text.replace("ctx.fillStyle = '#f4d03f';\n        ctx.beginPath();", "ctx.fillStyle = '#d6b66a';\n        ctx.beginPath();", 1)
text = text.replace("w?(on?'#efe1ac':'#8f99aa')", "w?(on?'#f1dfb2':'#94a7a5')", 1)

text = text.replace("drawPanel(ctx, ax, ay, aw, ah, 'rgba(8,10,18,0.85)', flash ? '#fff3b0' : ready ? '#f4d03f' : '#2f3644');",
                    "drawPanel(ctx, ax, ay, aw, ah, 'rgba(12,30,33,.88)', flash ? '#fff0bd' : ready ? '#d6b66a' : '#365356');", 1)
text = text.replace("ready?'#eee1b2':'#7c8494'", "ready?'#f1dfb2':'#829592'", 1)

# Softer premium dash palette.
text = text.replace("dashFlash ? '#fff' : dashReady ? '#1abc9c' : '#4f586a'", "dashFlash ? '#fff6d7' : dashReady ? '#69b8a5' : '#536764'", 1)
text = text.replace("ctx.fillStyle = dashFlash ? '#a3f0c2' : dashReady ? '#1abc9c' : '#4f586a';", "ctx.fillStyle = dashFlash ? '#b9e3cf' : dashReady ? '#69b8a5' : '#536764';", 1)

# Passive item strip becomes a rounded, quieter capsule.
old = "ctx.fillStyle='rgba(8,19,25,.66)';ctx.fillRect(4,294,n*18+8,19);"
new = "ctx.fillStyle='rgba(15,38,40,.68)';ctx.beginPath();ctx.roundRect(4,294,n*18+8,19,5);ctx.fill();ctx.strokeStyle='rgba(211,178,105,.12)';ctx.beginPath();ctx.roundRect(4.5,294.5,n*18+7,18,4.5);ctx.stroke();"
if old not in text: raise SystemExit('passive strip marker missing')
text = text.replace(old, new, 1)

render_path.write_text(text)

index = index_path.read_text()
if '0.7.14-premium-props-doors' not in index:
    raise SystemExit('Expected v0.7.14 marker not found')
index = index.replace('0.7.14-premium-props-doors', '0.7.15-premium-hud')
index_path.write_text(index)

print('Applied v0.7.15 premium HUD pass')
