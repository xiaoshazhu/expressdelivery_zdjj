import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'preview', 'field-published-simulation.html');
const port = Number(process.env.FIELD_MOCK_PORT || 8790);

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    response.writeHead(404).end('Not Found');
    return;
  }
  try {
    const page = await readFile(pagePath);
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    }).end(page);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('Unable to read the local simulation page');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`字段捷径上架效果模拟页：http://127.0.0.1:${port}/`);
  console.log('这是本地模拟页面，不代表已发布到飞书。');
});
