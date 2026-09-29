import type { ProviderId, RevenueProvider } from "../types";
import { createStripeProvider } from "./stripe";

const providers: Record<ProviderId, () => RevenueProvider> = {
  stripe: () => createStripeProvider(),
};

export function getProvider(id: ProviderId): RevenueProvider {
  return providers[id]();
}
