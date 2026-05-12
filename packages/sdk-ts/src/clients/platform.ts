import type { Platform } from '@absolo/contracts';
import { AbsoloHttp } from '../http.js';

export class PlatformClient {
  constructor(private readonly http: AbsoloHttp) {}

  async listRegions() {
    return this.http.request<{ data: Platform.Region[] }>('GET', '/v1/regions');
  }

  async getRegion(code: string) {
    return this.http.request<{ data: Platform.Region }>('GET', `/v1/regions/${code}`);
  }
}
