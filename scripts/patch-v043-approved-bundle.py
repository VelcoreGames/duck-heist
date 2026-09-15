from pathlib import Path

p = Path('web-release/assets/index-BgUNQzP_.js')
s = p.read_text(encoding='utf-8')

def repl(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    s = s.replace(old, new, 1)

# Pan Bomba Remoto.
repl('red_button:{action:"chaos",cooldown:1500}}','red_button:{action:"chaos",cooldown:1500},remote_bomb:{action:"remoteBomb",cooldown:720}}','remote bomb rule')
repl('if(e.state!==G.PLAYING||e.swap||e.transition.active||!t.activeItem||t.activeItemCooldown>0)return;','if(e.state!==G.PLAYING||e.swap||e.transition.active||!t.activeItem||t.activeItemCooldown>0&&!(t.activeItem==="remote_bomb"&&e.remoteBomb))return;','remote bomb cooldown bypass')
repl('case"bomb":Jt(e,ul(n,m,0,0,"baguette",30,!0,1,{explode:84,burning:f.burn>0}),o,!1);break;case"grenade":','case"bomb":Jt(e,ul(n,m,0,0,"baguette",30,!0,1,{explode:84,burning:f.burn>0}),o,!1);break;case"remoteBomb":if(e.remoteBomb){const h=e.remoteBomb;Jt(e,ul(h.x,h.y,0,0,"baguette",55,!0,1,{explode:120,burning:f.burn>0}),o,!1),Ee(e,h.x,h.y,"spark",18,"#f4d03f"),e.shakeIntensity=Math.max(e.shakeIntensity,4),e.remoteBomb=null}else e.remoteBomb={x:n,y:m,life:1800},Ee(e,n,m,"spark",8,"#e8c99b");break;case"grenade":','remote bomb action')

# Salas temporizadas: no completar la sala por el limpiado genérico mientras el evento sigue activo.
repl('if(!o.cleared&&r.enemies.length===0&&(r.alarmTimer??0)<=0){','if(!o.cleared&&!r.dangerEventActive&&r.enemies.length===0&&(r.alarmTimer??0)<=0){','timed challenge clear guard')

# Economía: conservar drops de migajas y encarecer la tienda por piso.
repl('return Math.max(1,Math.ceil(t.cost*o.shop*f))','return Math.max(1,Math.ceil(t.cost*o.shop*f*(1.25+e.map.floorIndex*.2)))','shop floor pricing')

# Menos abundancia de objetos.
repl('o()<.75&&fr(g(),w.ITEM,o)','o()<.35&&fr(g(),w.ITEM,o)','second item-room chance')
repl('t.elite&&Math.random()<.12&&o.items.push','t.elite&&Math.random()<.04&&o.items.push','elite item drop chance')
repl('(o.type===w.COMBAT||o.type===w.CHALLENGE)&&Math.random()<.16+ca(t).rewardChance+e.alert*6e-4+(o.modifier==="alarm"?.1:0)&&r.items.push','o.type===w.COMBAT&&Math.random()<.07+ca(t).rewardChance*.5+e.alert*3e-4+(o.modifier==="alarm"?.03:0)&&r.items.push','room-clear random item chance')

# TAB muestra estadísticas mientras se mantiene presionado.
repl('["arrowup","arrowdown","arrowleft","arrowright"," ","shift","e","r","m","escape","enter","1","2"].includes(J)','["arrowup","arrowdown","arrowleft","arrowright"," ","shift","e","r","m","tab","escape","enter","1","2"].includes(J)','tab prevent default')
repl('default:Rc(e),T1(e);break}t.restore()}function pr','default:Rc(e),T1(e),e.keys.tab&&DH_RUN_STATS(e);break}t.restore()}function DH_RUN_STATS(e){const t=e.ui,o=e.run,r=e.stats,f=e.player;t.save(),t.fillStyle="rgba(2,6,12,.82)",t.fillRect(0,0,K,x),Ga(t,104,50,272,244,"rgba(8,16,25,.98)","#d6b45f"),j(t,"ESTADÍSTICAS DE LA RUN",240,75,12,"#f4d03f","center",!0),j(t,`PISO  ${o.floorReached}/${K1}`,128,104,8,"#e9dfbd","left",!0),j(t,`SALAS  ${r.roomsCleared}`,128,127,8,"#cbd5d9","left"),j(t,`ENEMIGOS  ${r.enemiesDefeated}`,128,150,8,"#cbd5d9","left"),j(t,`JEFES  ${o.bosses}`,128,173,8,"#cbd5d9","left"),j(t,`MIGAJAS  ${Math.floor(f.crumbs)}`,252,104,8,"#e9dfbd","left",!0),j(t,`PAN ROBADO  ${r.breadStolen}`,252,127,8,"#cbd5d9","left"),j(t,`OBJETOS  ${o.items}`,252,150,8,"#cbd5d9","left"),j(t,`ARMAS  ${o.weaponsFound}`,252,173,8,"#cbd5d9","left"),j(t,`DAÑO HECHO  ${Math.round(o.dmgDealt)}`,128,208,8,"#9ec6b8","left"),j(t,`DAÑO RECIBIDO  ${Math.round(o.dmgTaken)}`,128,231,8,"#d7a39c","left"),j(t,"SUELTA TAB PARA CERRAR",240,272,7,"#8fa1a8","center"),t.restore()}function pr','tab stats overlay')

# Ajustar las pruebas internas al nuevo precio de tienda.
repl('o(u.player.crumbs===10&&y.shopItems[0].sold,"incorrect commit"),Us(u),o(u.player.crumbs===10,"double charge")','o(u.player.crumbs===5&&y.shopItems[0].sold,"incorrect commit"),Us(u),o(u.player.crumbs===5,"double charge")','shop self-test')
repl('o(go(u,{cost:20})===10,"sin descuento"),u.player.couponUsed=!0,o(go(u,{cost:20})===20,"descuento permanente")','o(go(u,{cost:20})===13,"sin descuento"),u.player.couponUsed=!0,o(go(u,{cost:20})===25,"descuento permanente")','coupon self-test')

if s.count('v0.4.2') != 2:
    raise SystemExit(f'version labels: expected 2, found {s.count("v0.4.2")}')
s = s.replace('v0.4.2', 'v0.4.3')

for needle in (
    'remote_bomb:{action:"remoteBomb",cooldown:720}',
    'case"remoteBomb":if(e.remoteBomb)',
    '!r.dangerEventActive&&r.enemies.length===0',
    '1.25+e.map.floorIndex*.2',
    'o()<.35&&fr(g(),w.ITEM,o)',
    't.elite&&Math.random()<.04&&o.items.push',
    'ESTADÍSTICAS DE LA RUN',
    'v0.4.3',
):
    if needle not in s:
        raise SystemExit(f'missing invariant: {needle}')

p.write_text(s, encoding='utf-8')

# La etiqueta DOM externa también debe reflejar la nueva versión; no se cambia ningún otro HTML.
html_path = Path('web-release/index.html')
html = html_path.read_text(encoding='utf-8')
if html.count("const VERSION = 'v0.4.2';") != 1:
    raise SystemExit('outer version label: expected one v0.4.2 marker')
html_path.write_text(html.replace("const VERSION = 'v0.4.2';", "const VERSION = 'v0.4.3';", 1), encoding='utf-8')
