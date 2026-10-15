import type { RevenueProvider, TransactionProviderId } from "../types";
import { createPolarProvider } from "./polar";
import { createStripeProvider } from "./stripe";

const providers: Record<TransactionProviderId, () => RevenueProvider> = {
  stripe: () => createStripeProvider(),
  polar: () => createPolarProvider(),
};

export function getProvider(id: TransactionProviderId): RevenueProvider {
  return providers[id]();
}
