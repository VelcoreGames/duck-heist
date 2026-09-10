import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync,mkdirSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { strFromU8,unzipSync } from 'fflate';
import { applyDuckLocalization } from './src/localization/materialize.mjs';
import { applyDuckAudio } from './src/audio/materializeAudio.mjs';
import { applyDuckHud } from './src/hud/materializeHud.mjs';
import { applyDuckDeath } from './src/death/materializeDeath.mjs';
import { applyDuckPickupSafety } from './src/gameplay/materializePickupSafety.mjs';
import { applyDuckResponsive } from './src/responsive/materializeResponsive.mjs';
import { applyDuckBossCombat } from './src/gameplay/materializeBossCombat.mjs';
import { applyDuckDifficulty } from './src/gameplay/materializeDifficulty.mjs';
import { applyDuckWeapons } from './src/gameplay/materializeWeapons.mjs';
import { applyDuckFullscreen } from './src/gameplay/materializeFullscreen.mjs';
import { applyDuckArsenal47 } from './src/gameplay/materializeArsenal47.mjs';
import { applyDuckAimHeldWeapon } from './src/gameplay/materializeAimHeldWeapon.mjs';
import { applyDuckPedestalStations } from './src/gameplay/materializePedestalStations.mjs';
import { applyDuckFairBalanceVan } from './src/gameplay/materializeFairBalanceVan.mjs';
import { applyDuckWorldPolish } from './src/gameplay/materializeWorldPolish.mjs';
import { applyDuckDestructibleBank } from './src/gameplay/materializeDestructibleBank.mjs';
import { applyDuckBankRoomLogic } from './src/gameplay/materializeBankRoomLogic.mjs';
import { applyDuckDirectRewards } from './src/gameplay/materializeDirectRewards.mjs';
import { applyDuckGunfeel } from './src/gameplay/materializeGunfeel.mjs';
import { applyDuckEventDanger } from './src/gameplay/materializeEventDanger.mjs';
import { applyDuckSpecialRoomTopology } from './src/gameplay/materializeSpecialRoomTopology.mjs';
import { applyDuckLegacyFloorCleanup } from './src/gameplay/materializeLegacyFloorCleanup.mjs';
import { applyDuckMenus } from './src/menu/materializeMenus.mjs';
import { applyDuckMenuOverhaul } from './src/menu/materializeMenuOverhaul.mjs';
import { applyDuckMenuCurrencyPolish } from './src/menu/materializeMenuCurrencyPolish.mjs';
import { applyDuckMacroPato } from './src/gameplay/materializeMacroPato.mjs';
import { applyDuckMacroPatoFinalScale } from './src/gameplay/materializeMacroPatoFinalScale.mjs';
import { applyDuckMacroPatoSpriteAsset } from './src/gameplay/materializeMacroPatoSpriteAsset.mjs';
import { applyDuckArtBibleV1 } from './src/art/materializeArtBibleV1.mjs';
import { applyDuckVisualEngineV2 } from './src/visual-v2/materializeVisualEngineV2.mjs';
import { applyDuckBaseMotionV2 } from './src/visual-v2/materializeBaseDuckMotionV2.mjs';

const zipPath=path.resolve(process.cwd(),'public/resources/duck-heist-source.zip');
const gameDir=path.resolve(process.cwd(),'src/duckgame');
function materializeDuckGame(){
    if(!existsSync(zipPath))throw new Error('Missing Duck Heist source ZIP resource.');
    rmSync(gameDir,{recursive:true,force:true});mkdirSync(gameDir,{recursive:true});
    const archive=unzipSync(new Uint8Array(readFileSync(zipPath)));
    for(const [rawName,bytes] of Object.entries(archive)){
        const normalized=rawName.replace(/\\/g,'/');const srcIndex=normalized.indexOf('src/');if(srcIndex<0)continue;
        const relative=normalized.slice(srcIndex+4);if(!relative||relative==='main.tsx'||!/\.(ts|tsx)$/.test(relative))continue;
        const target=path.resolve(gameDir,relative);if(!(target===gameDir||target.startsWith(gameDir+path.sep)))throw new Error('Unsafe source path in Duck Heist ZIP.');
        mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,strFromU8(bytes),'utf8');
    }
    if(!existsSync(path.join(gameDir,'App.tsx')))throw new Error('Duck Heist ZIP does not contain src/App.tsx.');
}
materializeDuckGame();
applyDuckLocalization(gameDir);
applyDuckAudio(gameDir);
applyDuckHud(gameDir);
applyDuckDeath(gameDir);
applyDuckPickupSafety(gameDir);
applyDuckBossCombat(gameDir);
applyDuckResponsive(gameDir);
applyDuckDifficulty(gameDir);
applyDuckWeapons(gameDir);
applyDuckFullscreen(gameDir);
applyDuckArsenal47(gameDir);
applyDuckAimHeldWeapon(gameDir);
applyDuckPedestalStations(gameDir);
applyDuckFairBalanceVan(gameDir);
applyDuckLegacyFloorCleanup(gameDir);
applyDuckWorldPolish(gameDir);
applyDuckDestructibleBank(gameDir);
applyDuckBankRoomLogic(gameDir);
applyDuckDirectRewards(gameDir);
applyDuckGunfeel(gameDir);
applyDuckEventDanger(gameDir);
applyDuckSpecialRoomTopology(gameDir);
applyDuckMenus(gameDir);
applyDuckMenuOverhaul(gameDir);
applyDuckMenuCurrencyPolish(gameDir);
applyDuckMacroPato(gameDir);
applyDuckMacroPatoFinalScale(gameDir);
applyDuckMacroPatoSpriteAsset(gameDir);
applyDuckArtBibleV1(gameDir);
applyDuckVisualEngineV2(gameDir);
applyDuckBaseMotionV2(gameDir);

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: process.env.APPDEPLOY_VITE_OUT_DIR || 'dist',
        sourcemap: process.env.APPDEPLOY_VITE_SOURCEMAP === 'hidden' ? 'hidden' : false,
        rollupOptions: {
            maxParallelFileOps: 128,
        },
    },
});
