import type { Bindings } from '@absolo/contracts';
import { AbsoloHttp } from '../http.js';

export class BindingsClient {
  constructor(private readonly http: AbsoloHttp) {}

  async bind(appId: string, body: Bindings.CreateBindingRequest) {
    return this.http.request<{ data: Bindings.Binding }>('POST', `/v1/apps/${appId}/bindings`, {
      body: JSON.stringify(body),
    });
  }

  async list(appId: string) {
    return this.http.request<{ data: Bindings.Binding[] }>('GET', `/v1/apps/${appId}/bindings`);
  }

  async unbind(appId: string, bindingId: string) {
    return this.http.request<{ ok: boolean }>('DELETE', `/v1/apps/${appId}/bindings/${bindingId}`);
  }

  async getInjectedEnvVars(appId: string) {
    return this.http.request<{ data: Record<string, string> }>(
      'GET',
      `/v1/apps/${appId}/bindings/env`,
    );
  }
}
