import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
cpSync('web-release', 'dist', { recursive: true });
console.log('Duck Heist web release copied to dist/');
