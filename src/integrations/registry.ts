import type { IntegrationAdapter, IntegrationCapability, IntegrationProvider } from "./types";

class IntegrationRegistry {
  private adapters = new Map<IntegrationProvider, IntegrationAdapter>();

  register(adapter: IntegrationAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: IntegrationProvider): IntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`Integration not registered: ${provider}`);
    return adapter;
  }

  has(provider: IntegrationProvider): boolean {
    return this.adapters.has(provider);
  }

  listAll(): IntegrationAdapter[] {
    return Array.from(this.adapters.values());
  }

  listCapable(capability: IntegrationCapability): IntegrationAdapter[] {
    return this.listAll().filter(a => a.capabilities.includes(capability));
  }
}

export const integrationRegistry = new IntegrationRegistry();
