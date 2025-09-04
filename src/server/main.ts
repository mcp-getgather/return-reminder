import express from 'express';
import { ProxyService } from './proxy-service.js';
import path from 'path';

import { fileURLToPath } from 'url';
import { settings } from './config.js';
import ViteExpress from 'vite-express';
import { ipBlocker } from './blocker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize proxy service
const proxyService = new ProxyService();

app.use(ipBlocker(proxyService));

app.get('/health', (_, res) => {
  res.send({ status: 'OK', timestamp: Math.floor(Date.now() / 1000) });
});

// Endpoint to receive order logs from the client and print them on the server console
app.post('/log-orders', (req, res) => {
  // The client sends an object: { brand: string, orders: PurchaseHistory[] }
  console.log(
    'Received orders from client:',
    JSON.stringify(req.body, null, 2)
  );
  // Respond with 204 No Content to signal successful receipt without extra payload
  res.sendStatus(204);
});

// Proxy all requests to /getgather/* to the GetGather API
app.all('/getgather/*name', async (req, res) => {
  const path = req.path.replace(/^\/getgather/, '');
  await proxyService.reverseProxy(req, res, path);
});

try {
  console.log('Checking GETGATHER_URL:', settings.GETGATHER_URL);
  const response = await fetch(settings.GETGATHER_URL);
  if (response.status === 200) {
    console.log('✓ GETGATHER_URL is reachable');
  } else {
    console.warn(`⚠ GETGATHER_URL returned status ${response.status}`);
  }
} catch (error) {
  console.error(
    '✗ GETGATHER_URL is not reachable:',
    error instanceof Error ? error.message : String(error)
  );
}

if (settings.NODE_ENV === 'development') {
  ViteExpress.listen(app, 3000, () =>
    console.log('Server is listening on port http://localhost:3000')
  );
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*name', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  app.listen(3000, () => {
    console.log('Server is running at http://localhost:3000');
  });
}
