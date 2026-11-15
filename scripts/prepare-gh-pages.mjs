import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const basePath = process.env.VITE_BASE_PATH || './';

console.log(`Building static GitHub Pages bundle with base "${basePath}"...`);
execSync('npx vite build', {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_BASE_PATH: basePath,
  },
});

const indexHtml = path.join(distDir, 'index.html');
const notFoundHtml = path.join(distDir, '404.html');
const noJekyll = path.join(distDir, '.nojekyll');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  fs.writeFileSync(noJekyll, '');
  console.log('Created dist/404.html and dist/.nojekyll for GitHub Pages.');
}
