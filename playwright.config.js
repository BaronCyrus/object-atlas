import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', timeout:30000, fullyParallel:true, workers:3,
  reporter:[['list'],['json',{outputFile:'reports/test-results.json'}]],
  use:{ baseURL:process.env.SITE_URL||'http://127.0.0.1:4173', viewport:{width:1440,height:1050},
    launchOptions:process.env.CI?{args:['--enable-unsafe-swiftshader']}:{executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-unsafe-swiftshader']} },
  webServer:process.env.SITE_URL?undefined:{command:'npm run dev -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI}
});
