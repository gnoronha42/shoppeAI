const { execSync } = require('child_process');

console.log('🔧 Instalando Chromium...');
execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
