const puppeteer = require('puppeteer');

const getCaptcha = async (i) => {
    const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
});

    const page = await browser.newPage();

    await page.goto('https://unifiedportal-emp.epfindia.gov.in/epfo/', {
        waitUntil: 'networkidle2'
    });

    try {
    await page.waitForSelector('#btnCloseModal', {
    });

    await page.click('#btnCloseModal');

    console.log('Popup closed');
} catch {
    console.log('Popup did not appear');
}

    // Wait for the image to appear
    await page.waitForSelector('.captcha-img'); 

    // Get the element
    const captcha = await page.$('.captcha-img');

    // Save only that element
    await captcha.screenshot({
        path: `captchaImages/captcha${i}.png`
    });

    await browser.close();
};
module.exports = {getCaptcha};