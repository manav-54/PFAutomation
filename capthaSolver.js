const puppeteer = require('puppeteer');

// Global index starting at 210 so the first generated image is captcha211.png
let globalIndex = 249;

const getCaptcha = async (count, workerId) => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        protocolTimeout: 1200000, // Increased timeout to prevent ProtocolError
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--ignore-certificate-errors'
        ]
    });

    const page = await browser.newPage();
    
    // 1. Go to the EPFO site to get the current session/image link
    console.log(`[Worker ${workerId}] Navigating to EPFO site...`);
    await page.goto('https://unifiedportal-emp.epfindia.gov.in/epfo/', {
        waitUntil: 'networkidle2', timeout : 1000000
    });

    // Close modal if it appears
    try {
        await page.waitForSelector('#btnCloseModal', { timeout: 5000 });
        await page.click('#btnCloseModal');
        console.log(`[Worker ${workerId}] Popup closed`);
    } catch {
        console.log(`[Worker ${workerId}] Popup did not appear`);
    }

    // 2. Extract the captcha image source
    console.log(`[Worker ${workerId}] Waiting for captcha image...`);
    await page.waitForSelector('.captcha-img');
    const imageLink = await page.$eval('.captcha-img', el => el.src);
    console.log(`[Worker ${workerId}] Extracted captcha link: ${imageLink}`);

    // 3. Open a new tab
    const newPage = await browser.newPage();
    await newPage.setCacheEnabled(false);

    // 4. Navigate directly to the extracted captcha link
    await newPage.goto(imageLink, {
        waitUntil: 'domcontentloaded'
    });

    // 5. Loop to save and refresh
    for (let i = 1; i <= count; i++) {
        // When navigating directly to an image, Chrome wraps it in an <img> tag
        const imageElement = await newPage.$('img');
        
        if (imageElement) {
            // Increment the global index atomically for each saved image
            const currentIndex = ++globalIndex;
            const filename = `captchaImages/captcha${currentIndex}.png`;
            
            // Save the image
            await imageElement.screenshot({
                path: filename
            });
            console.log(`[Worker ${workerId}] Saved ${filename} (${i}/${count})`);
        } else {
            console.log(`[Worker ${workerId}] Failed to find image element for captcha ${i}`);
        }

        // Refresh the page for the next captcha
        if (i < count) {
            await newPage.reload({ waitUntil: 'domcontentloaded' });
            // Small delay to ensure image loads
            await new Promise(r => setTimeout(r, 500)); 
        }
    }

    await browser.close();
};

// Start multiple workers simultaneously
const startWorkers = async (totalCaptchasNeeded, numberOfWorkers) => {
    console.log(`Starting ${numberOfWorkers} simultaneous workers...`);
    
    // Calculate how many captchas each worker should fetch
    const countPerWorker = Math.ceil(totalCaptchasNeeded / numberOfWorkers);
    
    const workers = [];
    for (let i = 1; i <= numberOfWorkers; i++) {
        workers.push(getCaptcha(countPerWorker, i));
    }

    // Wait for all workers to finish
    await Promise.all(workers);
    console.log('All workers have completed!');
};

// We want ~500 images total, split across 3 simultaneous browsers
startWorkers(42, 4);
