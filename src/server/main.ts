import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { Socket } from 'net';
import path from 'path';

import { fileURLToPath } from 'url';
import { settings } from './config.js';
import ViteExpress from 'vite-express';
import { ipBlocker } from './blocker.js';
import { mcpService } from './mcp-service.js';
import session, { SessionData } from 'express-session';
import bodyParser from 'body-parser';
import locationService from './location-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize proxy service

app.use(ipBlocker());

const createProxy = (path: string) =>
  createProxyMiddleware({
    target: `${settings.GETGATHER_URL}${path}`,
    changeOrigin: true,
    on: {
      proxyReq: fixRequestBody,
      error: (
        err: Error,
        req: express.Request,
        res: express.Response | Socket
      ) => {
        console.error(`Proxy req: ${req} error: ${err}`);
        if ('status' in res) {
          res.status(500).send('Proxy error occurred');
        }
      },
    },
  });

const proxyPaths = ['/link', '/__assets', '/__static/assets'];

proxyPaths.forEach((path) => {
  app.use(path, createProxy(path));
});
app.use('/api', async (req, res, next) => {
  bodyParser.json()(req, res, async (err) => {
    if (err) return next(err);

    if (req.method === 'POST') {
      if (!req.body) {
        req.body = {};
      }
      const clientIp = locationService.getClientIp(req);
      const requestLocationData =
        await locationService.getLocationForProxy(clientIp);
      req.body.location = requestLocationData;
    }

    createProxy('/api')(req, res, next);
  });
});

app.get('/health', (_, res) => {
  res.send({ status: 'OK', timestamp: Math.floor(Date.now() / 1000) });
});

app.use(
  session({
    secret: '1234567890',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: settings.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use((req, res, next) => {
  if (!('createdAt' in req.session)) {
    (req.session as unknown as SessionData & { createdAt: number }).createdAt =
      Date.now();
  }
  next();
});

app.post('/internal/mcp/retrieve-data', async (req, res) => {
  try {
    const { brand_id } = req.body;

    console.log('Retrieve data request for brand_id:', brand_id);

    if (!brand_id) {
      res.status(400).json({
        success: false,
        error: 'brand_id is required',
      });
      return;
    }

    const ipAddress = locationService.getClientIp(req);
    mcpService.setClientIpAddress(req.sessionID, ipAddress);
    const structuredContent = await mcpService.retrieveData(
      brand_id,
      req.sessionID
    );

    if (!structuredContent) {
      throw new Error('MCP tool returned no data');
    }

    // Check if we got a URL (authentication required) or direct data
    if (structuredContent?.url) {
      // Rewrite URL to use app host instead of GETGATHER_URL
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:3000';
      const appHost = `${protocol}://${host}`;
      const serverUrl = mcpService.getServerUrl();

      console.log(
        'Rewriting URL from',
        structuredContent.url,
        'with serverUrl',
        serverUrl,
        'to appHost',
        appHost
      );

      if (structuredContent.url.includes(serverUrl)) {
        structuredContent.url = structuredContent.url.replace(
          serverUrl,
          appHost
        );
      }
    }

    res.json({
      success: true,
      data: structuredContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/internal/mcp/poll-auth', async (req, res) => {
  try {
    const { link_id } = req.body;

    if (!link_id) {
      res.status(400).json({
        success: false,
        error: 'link_id is required',
      });
      return;
    }

    const structuredContent = await mcpService.pollSignin(
      link_id,
      req.sessionID
    );

    res.json({
      success: true,
      data: structuredContent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
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

if (settings.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*name', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  app.listen(3000, () => {
    console.log('Server is running at http://localhost:3000');
  });
} else {
  ViteExpress.listen(app, 3000, () =>
    console.log('Server is listening on port http://localhost:3000')
  );
}
