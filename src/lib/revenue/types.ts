// Provider-agnostic revenue model (Project.md §5). Providers only fetch + normalize;
// the metrics engine computes every number the same way for all providers.

export type ProviderId = "stripe";

/** A successful payment, net of refunds. Amounts are integer minor units (cents, satang…). */
export type NormalizedCharge = {
  occurredAt: Date;
  amountMinor: number;
  currency: string; // ISO 4217, lowercase (e.g. "usd", "thb")
  /** Opaque provider customer id — used only to count distinct customers, never shown or stored. */
  customerRef: string | null;
};

export type BillingInterval = "day" | "week" | "month" | "year";

export type NormalizedSubscription = {
  status: "active" | "past_due" | "trialing" | "other";
  customerRef: string | null;
  items: Array<{
    unitAmountMinor: number;
    currency: string;
    quantity: number;
    interval: BillingInterval;
    intervalCount: number;
  }>;
};

export type KeyValidation = {
  accountName: string | null;
  mode: "live" | "test";
};

export type ProviderErrorCode =
  | "invalid_key" // wrong format / revoked / unknown key
  | "not_read_only" // key can write → we refuse to store it
  | "missing_permission" // read-only but lacks a permission we need
  | "rate_limited"
  | "upstream"; // provider outage / unexpected response

export class ProviderError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    /** Safe, user-facing specifics (e.g. which Stripe resources have write access). Never secrets. */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface RevenueProvider {
  id: ProviderId;
  /** Throws ProviderError("invalid_key" | "not_read_only" | "missing_permission"). */
  validateKey(key: string): Promise<KeyValidation>;
  fetchCharges(key: string): AsyncIterable<NormalizedCharge>;
  fetchSubscriptions(key: string): AsyncIterable<NormalizedSubscription>;
}
