import { Request, Response } from 'express';
import { settings } from '../config.js';

export const handleLinkCreate = async (req: Request, res: Response) => {
  try {
    const { brand_id } = req.body;

    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const appBaseUrl = `${protocol}://${host}`;

    const baseUrl = settings.GETGATHER_URL.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/api/link/create`;

    const headers = {
      'Content-Type': 'application/json',
      accept: 'application/json',
    };

    const data = {
      brand_id,
    };

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

    if (responseBody.hosted_link_url && settings.GETGATHER_URL) {
      const getgatherOrigin = new URL(settings.GETGATHER_URL).origin;
      responseBody.hosted_link_url = responseBody.hosted_link_url.replace(
        getgatherOrigin,
        appBaseUrl
      );
    }

    res.json(responseBody);
  } catch (error) {
    console.error('Link creation failed:', error);
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
  } catch (error) {
    console.error('Link status retrieval failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Link status retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
};
