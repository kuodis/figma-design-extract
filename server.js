const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 9876;
const STORE_DIR = path.join(os.homedir(), '.design-systems');

fs.mkdirSync(STORE_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/extract') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const slug = (data.fileName || 'untitled')
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const filename = `${slug}.json`;

        const storePath = path.join(STORE_DIR, filename);
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2));

        const cwdPath = path.join(process.cwd(), 'design-system.json');
        fs.writeFileSync(cwdPath, JSON.stringify(data, null, 2));

        console.log(`Saved: ${storePath}`);
        console.log(`Saved: ${cwdPath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: storePath }));
      } catch (e) {
        console.error('Error:', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Design System receiver listening on http://localhost:${PORT}`);
  console.log(`Saves to: ${STORE_DIR}/`);
});
