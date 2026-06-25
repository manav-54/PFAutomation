const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const imagesDir = path.join(__dirname, 'captchaImages');

// Ensure the directory exists
if (!fs.existsSync(imagesDir)) {
    console.log(`Directory ${imagesDir} not found. Please run your captcha script first.`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        // Serve the UI
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Captcha Labeler</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; margin-top: 80px; background: #1a1a1a; color: #fff; }
                    .container { display: flex; flex-direction: column; align-items: center; background: #2a2a2a; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                    img { border: 2px solid #555; border-radius: 8px; margin-bottom: 25px; min-width: 200px; min-height: 60px; background: #fff; display: block; }
                    input { font-size: 24px; padding: 12px 20px; width: 250px; text-align: center; border-radius: 6px; border: 2px solid #444; background: #111; color: #fff; outline: none; transition: border-color 0.2s; letter-spacing: 2px; }
                    input:focus { border-color: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.3); }
                    .stats { margin-top: 20px; color: #888; font-size: 14px; }
                    .done { color: #4CAF50; font-size: 24px; font-weight: bold; display: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 style="margin-top:0;">Label Captchas</h2>
                    <img id="captcha" src="" alt="Loading..." />
                    <div class="done" id="doneMsg">All captchas labeled! 🎉</div>
                    <input type="text" id="labelInput" autofocus autocomplete="off" placeholder="Type text here..." />
                    <div class="stats" id="stats"></div>
                </div>
                <script>
                    let currentImage = '';
                    const imgEl = document.getElementById('captcha');
                    const inputEl = document.getElementById('labelInput');
                    const statsEl = document.getElementById('stats');
                    const doneEl = document.getElementById('doneMsg');

                    async function loadNext() {
                        const res = await fetch('/next');
                        if (res.status === 404) {
                            imgEl.style.display = 'none';
                            inputEl.style.display = 'none';
                            doneEl.style.display = 'block';
                            statsEl.innerText = '';
                            return;
                        }
                        const data = await res.json();
                        currentImage = data.image;
                        imgEl.src = '/image/' + currentImage + '?t=' + Date.now();
                        statsEl.innerText = \`Remaining: \${data.remaining}\`;
                    }

                    inputEl.addEventListener('input', (e) => {
                        let val = inputEl.value;
                        let formatted = '';
                        for (let i = 0; i < val.length; i++) {
                            if (i < 2) {
                                formatted += val[i].toUpperCase();
                            } else if (i < 4) {
                                formatted += val[i].toLowerCase();
                            } else {
                                formatted += val[i];
                            }
                        }
                        inputEl.value = formatted;
                    });

                    inputEl.addEventListener('keydown', async (e) => {
                        if (e.key === 'Enter') {
                            const label = inputEl.value.trim();
                            if (!label) return;
                            
                            inputEl.disabled = true;
                            await fetch('/rename', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: currentImage, label })
                            });
                            inputEl.value = '';
                            inputEl.disabled = false;
                            inputEl.focus();
                            loadNext();
                        }
                    });

                    loadNext();
                </script>
            </body>
            </html>
        `);
    } else if (req.method === 'GET' && req.url === '/next') {
        fs.readdir(imagesDir, (err, files) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error reading directory');
            }
            
            // Look for files named "captcha<something>.png"
            const captchas = files.filter(f => f.startsWith('captcha') && f.endsWith('.png'));
            
            if (captchas.length === 0) {
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                // We pick the first one to show
                res.end(JSON.stringify({ image: captchas[0], remaining: captchas.length }));
            }
        });
    } else if (req.method === 'GET' && req.url.startsWith('/image/')) {
        // Remove query parameters like ?t=12345
        const basePath = req.url.split('?')[0];
        const imageName = decodeURIComponent(basePath.split('/')[2]);
        const imagePath = path.join(imagesDir, imageName);
        fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end();
            }
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(data);
        });
    } else if (req.method === 'POST' && req.url === '/rename') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { image, label } = JSON.parse(body);
                const safeImage = path.basename(image);
                let safeLabel = path.basename(label);
                
                // Add .png extension if user didn't type it
                if (!safeLabel.toLowerCase().endsWith('.png')) {
                    safeLabel += '.png';
                }
                
                const oldPath = path.join(imagesDir, safeImage);
                const newPath = path.join(imagesDir, safeLabel);
                
                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                }
                res.writeHead(200);
                res.end('OK');
            } catch (e) {
                res.writeHead(500);
                res.end('Error');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🎉 Labeling script is running!`);
    console.log(`👉 Open http://localhost:${PORT} in your web browser`);
    console.log(`======================================================\n`);
});
