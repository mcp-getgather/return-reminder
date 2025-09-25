import { City, WebServiceClient } from '@maxmind/geoip2-node';
import { settings } from './config.js';
import { Cache } from './cache.js';
import { Logger } from './logger.js';

const ipCache = new Cache(5);

export class MaxMindService {
  private accountId: string;
  private licenseKey: string;

  constructor() {
    this.accountId = settings.MAXMIND_ACCOUNT_ID;
    this.licenseKey = settings.MAXMIND_LICENSE_KEY;
  }

  async geolocateIp(ipAddress: string): Promise<City | null> {
    const cached = ipCache.get(ipAddress);
    if (cached) {
      Logger.debug('[MaxMind] Retrieved cached location data', { ipAddress });
      return cached;
    }

    if (!this.accountId || !this.licenseKey) {
      Logger.warn('[MaxMind] Credentials not configured');
      return null;
    }

    try {
      const client = new WebServiceClient(this.accountId, this.licenseKey);
      const response = await client.city(ipAddress);
      ipCache.set(ipAddress, response);
      Logger.debug('[MaxMind] Cached location data', { ipAddress });
      return response;
    } catch (error) {
      Logger.error('[MaxMind] Geolocation failed', error as Error, {
        component: 'maxmind-service',
        ipAddress,
      });
      return null;
    }
  }
}
