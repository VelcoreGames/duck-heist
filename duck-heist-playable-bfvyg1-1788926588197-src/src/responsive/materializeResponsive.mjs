import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const replaceOnce=(src,re,to,label)=>{const next=src.replace(re,to);if(next===src)throw new Error('Responsive patch failed: '+label);return next;};
const SCALE=`/** Escala responsiva uniforme: nunca deforma el pixel art ni la geometría del juego */
  const computeScale = useCallback(() => {
    const vv=window.visualViewport;
    const vw=Math.max(1,vv?.width??window.innerWidth);
    const vh=Math.max(1,vv?.height??window.innerHeight);
    const fullscreen=!!document.fullscreenElement;
    const rootStyle=getComputedStyle(document.documentElement);
    const safe=(name:string)=>parseFloat(rootStyle.getPropertyValue(name))||0;
    const safeX=safe('--duck-safe-left')+safe('--duck-safe-right');
    const safeY=safe('--duck-safe-top')+safe('--duck-safe-bottom');
    const side=fullscreen?0:Math.max(2,Math.min(8,vw*.006));
    const top=fullscreen?0:Math.max(2,Math.min(7,vh*.008));
    const footer=fullscreen?0:vh<440?18:24;
    const availW=Math.max(1,vw-safeX-side*2);
    const availH=Math.max(1,vh-safeY-top*2-footer);
    const eng=engineRef.current;
    const maxCss=fullscreen?8:eng?Math.max(1.25,Math.min(7,eng.settings.uiScale+3)):7;
    const css=Math.max(.2,Math.min(availW/CANVAS_WIDTH,availH/CANVAS_HEIGHT,maxCss));
    const displayW=Math.max(1,Math.floor(CANVAS_WIDTH*css));
    const displayH=Math.max(1,Math.floor(CANVAS_HEIGHT*css));
    const dpr=Math.max(1,Math.min(2.25,window.devicePixelRatio||1));
    return {displayW,displayH,css,ui:Math.max(1,Math.min(6,Math.ceil(css*dpr)))};
  }, []);`;
const APPLY=`    const applySize = () => {
      const {displayW,displayH,css,ui}=computeScale();
      const wrap=wrapRef.current;
      if(wrap){wrap.style.width=\`${'${displayW}'}px\`;wrap.style.height=\`${'${displayH}'}px\`;}
      for(const c of [wc,uc]){c.style.width=\`${'${displayW}'}px\`;c.style.height=\`${'${displayH}'}px\`;c.style.imageRendering='pixelated';}
      const nextUiW=CANVAS_WIDTH*ui,nextUiH=CANVAS_HEIGHT*ui;
      if(uc.width!==nextUiW)uc.width=nextUiW;
      if(uc.height!==nextUiH)uc.height=nextUiH;
      engine.uiScale=ui;
      engine.scale=css;
    };
    let resizeRaf=0;
    const scheduleSize=()=>{if(resizeRaf)cancelAnimationFrame(resizeRaf);resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;applySize();});};
    applySize();`;
export function applyDuckResponsive(gameDir){
  const file=path.join(gameDir,'App.tsx');let s=readFileSync(file,'utf8');
  s=replaceOnce(s,/\/\*\* Escala entera para el canvas de mundo \+ supersampling para la UI \*\/[\s\S]*?  \}, \[\]\);/,SCALE,'scale');
  s=replaceOnce(s,/    const applySize = \(\) => \{[\s\S]*?    \};\n    applySize\(\);/,APPLY,'applySize');
  s=replaceOnce(s,"    window.addEventListener('resize', applySize);",`    window.addEventListener('resize',scheduleSize,{passive:true});
    window.addEventListener('orientationchange',scheduleSize,{passive:true});
    window.visualViewport?.addEventListener('resize',scheduleSize,{passive:true});
    window.visualViewport?.addEventListener('scroll',scheduleSize,{passive:true});`,'resize listeners');
  s=replaceOnce(s,"      applySize();\n    };\n    document.addEventListener('fullscreenchange', onFsChange);","      scheduleSize();\n    };\n    document.addEventListener('fullscreenchange', onFsChange);",'fullscreen resize');
  s=replaceOnce(s,"        applySize();\n      }","        scheduleSize();\n      }",'settings resize');
  s=replaceOnce(s,"      window.removeEventListener('resize', applySize);",`      window.removeEventListener('resize',scheduleSize);
      window.removeEventListener('orientationchange',scheduleSize);
      window.visualViewport?.removeEventListener('resize',scheduleSize);
      window.visualViewport?.removeEventListener('scroll',scheduleSize);
      if(resizeRaf)cancelAnimationFrame(resizeRaf);`,'resize cleanup');
  s=replaceOnce(s,'<div className="relative w-screen h-screen overflow-hidden bg-[#04050b] text-[#c3cbd9] flex flex-col items-center justify-center select-none"','<div className="duck-responsive-shell relative w-screen h-screen overflow-hidden bg-[#04050b] text-[#c3cbd9] flex flex-col items-center justify-center select-none"','shell class');
  s=replaceOnce(s,'<div ref={wrapRef} className="relative z-10"','<div ref={wrapRef} className="duck-responsive-stage relative z-10"','stage class');
  s=replaceOnce(s,'<div className="pointer-events-none absolute -inset-3 rounded-[2px] border border-[#2f3644]" />','<div className="duck-responsive-frame duck-frame-near pointer-events-none absolute -inset-3 rounded-[2px] border border-[#2f3644]" />','near frame');
  s=replaceOnce(s,'<div className="pointer-events-none absolute -inset-6 rounded-[3px] border border-[#161c2a]" />','<div className="duck-responsive-frame duck-frame-far pointer-events-none absolute -inset-6 rounded-[3px] border border-[#161c2a]" />','far frame');
  s=replaceOnce(s,'<div className="relative z-10 mt-6 flex max-w-[94vw] items-center gap-4 text-[10px] tracking-[0.12em] font-semibold uppercase">','<div className="duck-responsive-footer relative z-10 mt-6 flex max-w-[94vw] items-center gap-4 text-[10px] tracking-[0.12em] font-semibold uppercase">','footer class');
  s=replaceOnce(s,'<span className="hidden text-[#6a817f] md:block">{hint}</span>','<span className="duck-responsive-hint hidden text-[#6a817f] md:block">{hint}</span>','hint class');
  s=replaceOnce(s,'className="pointer-events-auto text-[#7c8494] hover:text-[#f4d03f] transition-colors border border-transparent hover:border-[#f4d03f]/40 px-2 py-0.5">','className="duck-responsive-fullscreen pointer-events-auto text-[#7c8494] hover:text-[#f4d03f] transition-colors border border-transparent hover:border-[#f4d03f]/40 px-2 py-0.5">','fullscreen class');
  writeFileSync(file,s,'utf8');
}