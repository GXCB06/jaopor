import type { RevenueProvider, TransactionProviderId } from "../types";
import { createStripeProvider } from "./stripe";

const providers: Record<TransactionProviderId, () => RevenueProvider> = {
  stripe: () => createStripeProvider(),
};

export function getProvider(id: TransactionProviderId): RevenueProvider {
  return providers[id]();
}
