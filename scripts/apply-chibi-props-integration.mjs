import fs from 'node:fs';

const path = 'src/game/render.ts';
let source = fs.readFileSync(path, 'utf8');

const importAnchor = "import { drawChibiPoliceDuck } from './graphics/enemyChibi';";
const importLine = "import { drawChibiLobbyObstacle } from './graphics/chibiProps';";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('chibi enemy import anchor not found');
  source = source.replace(importAnchor, `${importAnchor}\n${importLine}`);
}

const oldObstacle = `      if (t >= OBSTACLE_BASE) drawObstacle(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);`;
const newObstacle = `      if (t >= OBSTACLE_BASE) {\n        if (engine.map.floorIndex === 0) drawChibiLobbyObstacle(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);\n        else drawObstacle(ctx, x * TILE_SIZE, y * TILE_SIZE, t - OBSTACLE_BASE, f);\n      }`;
if (source.includes(oldObstacle)) source = source.replace(oldObstacle, newObstacle);

if (!source.includes('drawChibiLobbyObstacle(ctx')) throw new Error('chibi lobby obstacle integration was not applied');

fs.writeFileSync(path, source);
console.log('Chibi lobby props integrated into floor 1 without changing layout or collisions.');
