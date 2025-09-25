import { City, WebServiceClient } from '@maxmind/geoip2-node';
import { settings } from './config.js';
import { Cache } from './cache.js';
import { Request } from 'express';

type LocationData = {
  ip: string;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
};

const ipCache = new Cache(5);

export class LocationService {
  private accountId: string;
  private licenseKey: string;

  constructor() {
    this.accountId = settings.MAXMIND_ACCOUNT_ID;
    this.licenseKey = settings.MAXMIND_LICENSE_KEY;
  }

  getClientIp(request: Request): string {
    const xff = request.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') {
      return xff.split(',')[0].trim();
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  async getLocation(ipAddress: string): Promise<City | null> {
    console.log(`🔍 Getting client location for IP: ${ipAddress}`);

    if (
      ipAddress === 'unknown' ||
      ipAddress.includes('127.0.0.1') ||
      ipAddress.includes('localhost') ||
      ipAddress === '::1'
    ) {
      console.log('[LocationService] unknown ip address: ', ipAddress);
      return null;
    }

    const cached = ipCache.get(ipAddress);
    if (cached) {
      console.log(
        '[LocationService] cached response for ip address: ',
        ipAddress
      );
      return cached;
    }

    if (!this.accountId || !this.licenseKey) {
      console.warn(
        '[LocationService] MaxMind account ID or license key not configured'
      );
      return null;
    }

    try {
      const client = new WebServiceClient(this.accountId, this.licenseKey);
      const response = await client.city(ipAddress);
      ipCache.set(ipAddress, response);
      console.log('[LocationService] set cache for ip address: ', ipAddress);
      return response;
    } catch (error) {
      console.error(`Unexpected error geolocating IP ${ipAddress}:`, error);
      return null;
    }
  }

  async getLocationForProxy(ipAddress: string): Promise<LocationData> {
    console.log(`🔍 Getting client location for IP: ${ipAddress}`);

    let requestLocationData: LocationData = {
      ip: ipAddress,
      city: null,
      state: null,
      country: null,
      postal_code: null,
    };

    const locationData = await this.getLocation(ipAddress);

    if (locationData) {
      requestLocationData = {
        ...requestLocationData,
        city: locationData?.city?.names.en ?? null,
        state:
          locationData?.subdivisions?.[locationData.subdivisions.length - 1]
            ?.names.en ?? null,
        country: locationData?.country?.isoCode ?? null,
        postal_code: locationData?.postal?.code ?? null,
      };

      console.log(
        `🔍 Client Location: city: ${requestLocationData.city}, country: ${requestLocationData.country}, state: ${requestLocationData.state}, postal_code: ${requestLocationData.postal_code}`
      );
    }

    return requestLocationData;
  }
}

const locationService = new LocationService();

export default locationService;
