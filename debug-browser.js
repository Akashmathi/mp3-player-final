const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    process.stdout.write("Navigating to localhost:5174...\\n");
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0', timeout: 10000 });
    process.stdout.write("Done!\\n");
    await browser.close();
  } catch (error) {
    console.error("Puppeteer Script Error:", error.message);
    process.exit(1);
  }
})();
