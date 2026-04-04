import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    console.log("Navigating to https://final-mp3.vercel.app/ ...");
    await page.goto('https://final-mp3.vercel.app/', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log("Done! Reading errors.");
    await browser.close();
  } catch (error) {
    console.error("Puppeteer Script Error:", error.message);
    process.exit(1);
  }
})();
