import { Request, Response } from 'express';
import { settings } from '../config.js';
import { createSanitizedLogMessage } from '../utils/request-sanitizer.js';

export const handleLinkCreate = async (req: Request, res: Response) => {
  if (!settings.USE_HOSTED_LINK) {
    return res.status(400).json({ error: 'Hosted link mode is not enabled' });
  }

  try {
    const { brand_id = 'amazon', redirect_url } = req.body;

    // Get the app's base URL dynamically
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const appBaseUrl = `${protocol}://${host}`;

    // Set redirect URL to return to our app after auth
    const finalRedirectUrl = redirect_url || appBaseUrl;

    const baseUrl = settings.GETGATHER_URL.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/api/link/create`;

    const headers = {
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    const data = {
      brand_id,
      redirect_url: finalRedirectUrl,
      url_lifetime_seconds: 900,
    };

    console.log(createSanitizedLogMessage('🔗 Link creation request', data));

    const upstreamResponse = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30000),
    });

    if (!upstreamResponse.ok) {
      throw new Error(
        `Failed to create hosted link: ${upstreamResponse.statusText}`
      );
    }

    res.status(upstreamResponse.status);

    const responseBody = await upstreamResponse.json();

    // Replace mcp-getgather URL with our app's URL
    if (responseBody.hosted_link_url && settings.GETGATHER_URL) {
      const getgatherOrigin = new URL(settings.GETGATHER_URL).origin;
      responseBody.hosted_link_url = responseBody.hosted_link_url.replace(
        getgatherOrigin,
        appBaseUrl
      );
    }

    res.json(responseBody);

    console.log('✅ Link created successfully');
  } catch (error) {
    console.error('❌ Link creation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Link creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

export const handleLinkStatus = async (req: Request, res: Response) => {
  try {
    const { link_id } = req.params;

    if (!link_id) {
      return res.status(400).json({
        error: 'link_id parameter is required',
      });
    }

    const baseUrl = settings.GETGATHER_URL.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/api/link/status/${link_id}`;

    const headers = {
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    console.log(
      createSanitizedLogMessage('📊 Link status request', { link_id })
    );

    const upstreamResponse = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!upstreamResponse.ok) {
      throw new Error(
        `Failed to get link status: ${upstreamResponse.statusText}`
      );
    }

    res.status(upstreamResponse.status);

    const responseBody = await upstreamResponse.json();
    res.json(responseBody);

    console.log('✅ Link status retrieved successfully');
  } catch (error) {
    console.error('❌ Link status retrieval failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Link status retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

