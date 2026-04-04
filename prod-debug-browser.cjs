const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    process.stdout.write("Navigating to https://final-mp3.vercel.app/ ...\\n");
    await page.goto('https://final-mp3.vercel.app/', { waitUntil: 'networkidle0', timeout: 15000 });
    process.stdout.write("Done! Reading errors.\\n");
    await browser.close();
  } catch (error) {
    console.error("Puppeteer Script Error:", error.message);
    process.exit(1);
  }
})();
