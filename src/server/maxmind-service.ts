import { City, WebServiceClient } from '@maxmind/geoip2-node';
import { settings } from './config.js';
import { Cache } from './cache.js';

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
      console.log(
        '[MaxMindService] cached response for ip address: ',
        ipAddress
      );
      return cached;
    }

    if (!this.accountId || !this.licenseKey) {
      console.warn(
        '[MaxMindService] MaxMind account ID or license key not configured'
      );
      return null;
    }

    try {
      const client = new WebServiceClient(this.accountId, this.licenseKey);
      const response = await client.city(ipAddress);
      ipCache.set(ipAddress, response);
      console.log('[MaxMindService] set cache for ip address: ', ipAddress);
      return response;
    } catch (error) {
      console.error(`Unexpected error geolocating IP ${ipAddress}:`, error);
      return null;
    }
  }
}
