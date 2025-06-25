import { City } from '@maxmind/geoip2-node';

export class Cache {
  private maxSize: number;
  private cache: Map<string, City>;
  private keys: string[];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.keys = [];
  }

  get(key: string) {
    return this.cache.get(key) || null;
  }

  set(key: string, value: City) {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      return;
    }

    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.keys.shift();
      if (!oldestKey) {
        return;
      }
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, value);
  }

  has(key: string) {
    return this.cache.has(key);
  }
}
