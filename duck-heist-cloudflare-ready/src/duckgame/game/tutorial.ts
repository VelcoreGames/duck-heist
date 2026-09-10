import type { GameEngine } from './types';
import { permanentSnapshot } from './progress';

export type TutorialAction='map'|'wheel'|'dash';
export function completeTutorial(e:GameEngine,action:TutorialAction) {
  if(e.tutorial[action]) return;
  e.tutorial[action]=true;
  if(e.tutorialHint?.kind===action) e.tutorialHint=null;
  if(!e.testing) try{localStorage.setItem('duckheist_save',JSON.stringify(permanentSnapshot(e)));}catch{/* Storage may be disabled. */}
}
export function updateTutorial(e:GameEngine) {
  if(e.tutorialHint && --e.tutorialHint.timer<=0) e.tutorialHint=null;
  if(e.tutorialHint || !e.tutorialRun) return;
  if(!e.tutorial.map&&!e.tutorial.mapShown && e.seenRoomKeys.length>=3) {
    e.tutorial.mapShown=true;e.tutorialHint={kind:'map',timer:330};
    if(!e.testing)try{localStorage.setItem('duckheist_save',JSON.stringify(permanentSnapshot(e)));}catch{/* Optional storage. */}
  } else if(!e.tutorial.wheel&&e.player.weapons[1] && e.run.time%600===60) e.tutorialHint={kind:'wheel',timer:240};
  else if(!e.tutorial.dash&&e.run.time===150) e.tutorialHint={kind:'dash',timer:240};
}