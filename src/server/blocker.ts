import { NextFunction, Request, Response } from 'express';
import locationService from './location-service.js';
import { ProxyService } from './proxy-service.js';
import { Logger } from './logger.js';

const blockedDomains = [
  // Amazon
  'amazonaws.com',
  'compute.amazonaws.com',

  // Google Cloud
  'google.com',
  'googleusercontent.com',
  'cloud.google.com',
  'gcp.gvt2.com',

  // Microsoft Azure
  'microsoft.com',
  'azure.com',
  'cloudapp.net',

  // Alibaba Cloud
  'alibaba.com',
  'aliyun.com',
  'alibabacloud.com',

  // DigitalOcean
  'digitalocean.com',

  // Oracle Cloud
  'oracle.com',
  'oraclecloud.com',

  // OVH
  'ovh.net',
  'ovhcloud.com',

  // Linode
  'linode.com',

  // Hetzner
  'hetzner.com',
  'hetzner.de',

  // Vultr
  'vultr.com',

  // Tencent Cloud
  'tencent.com',
  'tencentcloud.com',

  // IBM Cloud
  'ibm.com',
  'softlayer.com',

  'choopa.com', // Sometimes associated with scanning activity
  'leaseweb.com',
  'contabo.com',
  'cloudsigma.com',
];

export const ipBlocker =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = locationService.getClientIp(req);
      const result = await locationService.getLocation(ip);
      if (result) {
        Logger.debug('IP geolocation result', {
          ip,
          domain: result.traits?.domain,
          country: result.country?.isoCode,
        });
      }
      if (result && result.traits?.domain) {
        const domain = result.traits.domain;

        if (
          blockedDomains.some((cloudDomain) =>
            domain.toLowerCase().includes(cloudDomain)
          )
        ) {
          Logger.warn('Blocked domain access', {
            ip,
            domain,
            component: 'ip-blocker',
          });
          const delay = 3000 + Math.random() * 5000;
          setTimeout(() => {
            res.status(403).send('Access denied.');
          }, delay);
          return;
        }
      }

      next();
    } catch (error) {
      Logger.error('GeoIP lookup failed', error as Error, {
        component: 'ip-blocker',
        ip: req.ip || 'unknown',
      });
      next();
    }
  };
