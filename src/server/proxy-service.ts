import { Request, Response } from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { settings } from './config.js';
import { MaxMindService } from './maxmind-service.js';
import { City } from '@maxmind/geoip2-node';

export class ProxyService {
  private maxmindService: MaxMindService;

  constructor() {
    this.maxmindService = new MaxMindService();
  }

  getClientIp(request: Request): string {
    const xff = request.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') {
      return xff.split(',')[0].trim();
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  async getClientLocation(ipAddress: string): Promise<City | null> {
    console.log(`🔍 Getting client location for IP: ${ipAddress}`);

    if (
      ipAddress === 'unknown' ||
      ipAddress.includes('127.0.0.1') ||
      ipAddress.includes('localhost') ||
      ipAddress === '::1'
    ) {
      return null;
    }

    return await this.maxmindService.geolocateIp(ipAddress);
  }

  async reverseProxy(
    request: Request,
    response: Response,
    path: string
  ): Promise<void> {
    const clientIp = this.getClientIp(request);
    const locationData = await this.getClientLocation(clientIp);

    let clientLocation:
      | {
          city: string | undefined;
          state: string | undefined;
          country: string | undefined;
          postal_code: string | undefined;
        }
      | undefined;

    if (locationData) {
      clientLocation = {
        city: locationData?.city?.names.en,
        state:
          locationData?.subdivisions?.[locationData.subdivisions.length - 1]
            ?.names.en,
        country: locationData?.country?.isoCode,
        postal_code: locationData?.postal?.code,
      };
    }

    console.log(
      `🔍 Client Location: ${clientLocation?.city}, ${clientLocation?.country}, ${clientLocation?.state}, ${clientLocation?.postal_code}`
    );

    const baseUrl = settings.GETGATHER_URL.replace(/\/$/, '');
    const pathStr = path.replace(/^\//, '');
    const targetUrl = `${baseUrl}/${pathStr}`;

    const parsedGatherUrl = new URL(settings.GETGATHER_URL);

    // Prepare upstream request headers
    const upstreamHeaders: Record<string, string> = {};

    // Copy relevant headers
    Object.keys(request.headers).forEach((key) => {
      const value = request.headers[key];
      if (typeof value === 'string') {
        upstreamHeaders[key] = value;
      }
    });

    // Set specific headers
    upstreamHeaders['host'] = parsedGatherUrl.host;
    upstreamHeaders['Authorization'] = `Bearer ${settings.GETGATHER_API_KEY}`;
    upstreamHeaders['X-Forwarded-IP'] = clientIp;

    // Remove headers that shouldn't be forwarded
    const headersToRemove = [
      'transfer-encoding',
      'content-length',
      'connection',
    ];
    headersToRemove.forEach((header) => {
      delete upstreamHeaders[header];
    });

    // Prepare request body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contentToSend: any = request.body;
    const contentType = request.headers['content-type'] || '';

    if (contentType.toLowerCase().includes('application/json')) {
      try {
        const data = request.body || {};
        data.forwarded_ip = clientIp;
        data.location = {
          city: clientLocation?.city ?? null,
          state: clientLocation?.state ?? null,
          country: clientLocation?.country ?? null,
          postal_code: clientLocation?.postal_code ?? null,
          ip: clientIp,
        };
        contentToSend = data;
      } catch (error) {
        console.error('Error processing JSON body:', error);
      }
    }

    try {
      // Make the upstream request
      const axiosConfig: AxiosRequestConfig = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        method: request.method as any,
        url: targetUrl,
        headers: upstreamHeaders,
        params: request.query,
        data: contentToSend,
        timeout: 300_000, // 5 minutes
        responseType: 'arraybuffer',
        validateStatus: () => true, // Don't throw on non-2xx status codes
      };
      console.log('Request URL:', targetUrl);

      const upstreamResponse = await axios(axiosConfig);
      // Prepare response headers
      const responseHeaders: Record<string, string> = {};
      Object.keys(upstreamResponse.headers).forEach((key) => {
        const value = upstreamResponse.headers[key];
        if (typeof value === 'string') {
          responseHeaders[key] = value;
        }
      });

      // Remove headers that shouldn't be sent downstream
      const headersToStrip = [
        'content-encoding',
        'content-length',
        'transfer-encoding',
      ];
      headersToStrip.forEach((header) => {
        delete responseHeaders[header];
      });

      // Set response headers
      Object.keys(responseHeaders).forEach((key) => {
        response.setHeader(key, responseHeaders[key]);
      });

      // Send response
      console.log('upstreamResponse status', upstreamResponse.status);
      response.status(upstreamResponse.status);
      response.send(upstreamResponse.data);
    } catch (error) {
      console.error('Proxy error:', error);
      response.status(500).json({ error: 'Internal server error' });
    }
  }
}
