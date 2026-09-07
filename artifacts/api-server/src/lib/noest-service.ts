/**
 * NOEST Express carrier service.
 * All API calls are made exclusively from this module.
 * Credentials are read from environment variables — never logged or sent to frontend.
 */

const BASE_URL = process.env.NOEST_API_BASE_URL?.replace(/\/$/, '') ?? '';
const API_TOKEN = process.env.NOEST_API_TOKEN ?? '';
const USER_GUID = process.env.NOEST_USER_GUID ?? '';

const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;

// ── NOEST delivery type constants ─────────────────────────────────────────────
export const NOEST_DELIVERY_TYPES = {
  HOME: 'home_delivery',      // Livraison à domicile
  STOP_DESK: 'stop_desk',     // Stop Desk / bureau
} as const;

export type NoestDeliveryType = typeof NOEST_DELIVERY_TYPES[keyof typeof NOEST_DELIVERY_TYPES];

// ── Status mapping: NOEST → internal delivery_status ─────────────────────────
export const NOEST_STATUS_MAP: Record<string, string> = {
  // Common NOEST status codes
  'created':            'sent_to_noest',
  'ready':              'en_preparation',
  'picked_up':          'expedie',
  'in_transit':         'en_transit',
  'out_for_delivery':   'en_livraison',
  'delivered':          'livre',
  'failed_attempt':     'echec_livraison',
  'returned':           'retour',
  'cancelled':          'annule',
  // French variants some carriers use
  'en préparation':     'en_preparation',
  'expédié':            'expedie',
  'en transit':         'en_transit',
  'en cours de livraison': 'en_livraison',
  'livré':              'livre',
  'échec':              'echec_livraison',
  'retour':             'retour',
  'annulé':             'annule',
};

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface NoestCreateParcelInput {
  /** Recipient full name */
  recipientName: string;
  /** Recipient phone (Algerian) */
  recipientPhone: string;
  /** Wilaya name or code */
  wilaya: string;
  /** Commune name */
  commune: string;
  /** Street address */
  address: string;
  /** Product description for parcel */
  description: string;
  /** Number of pieces */
  pieces: number;
  /** Amount to collect (cash on delivery) */
  collectionAmount: number;
  /** Delivery type */
  deliveryType: NoestDeliveryType;
  /** Weight in kg (optional) */
  weightKg?: number;
  /** Notes for the carrier */
  notes?: string;
  /** Internal order reference */
  orderReference?: string;
}

export interface NoestParcelResult {
  shipmentId: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  status: string;
  rawStatus: string;
}

export interface NoestStatusResult {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  rawStatus: string;
  updatedAt?: string;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  if (!API_TOKEN) throw new Error('NOEST_API_TOKEN is not configured');
  if (!USER_GUID) throw new Error('NOEST_USER_GUID is not configured');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'X-User-Guid': USER_GUID,
  };
}

async function noestFetch(
  method: string,
  path: string,
  body?: unknown,
  attempt = 0,
): Promise<any> {
  if (!BASE_URL) throw new Error('NOEST_API_BASE_URL is not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON response */ }

    if (!res.ok) {
      const message = json?.message ?? json?.error ?? text ?? res.statusText;
      // 409 = already exists (idempotency)
      if (res.status === 409) {
        const err = new Error(`NOEST conflict (409): ${message}`);
        (err as any).status = 409;
        throw err;
      }
      throw new Error(`NOEST API error ${res.status}: ${message}`);
    }

    return json;
  } catch (err: any) {
    clearTimeout(timer);
    // Retry on network errors (not 4xx)
    if (attempt < MAX_RETRIES && err.name !== 'AbortError' && !(err as any).status) {
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      return noestFetch(method, path, body, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Test connectivity without exposing any credentials in the response.
 * Returns { ok: true } on success or throws.
 */
export async function testConnection(): Promise<{ ok: true; message: string }> {
  // Try a lightweight endpoint — GET /api/v1/ping or /api/v1/status
  // Adapt the path to what NOEST actually exposes.
  await noestFetch('GET', '/api/v1/ping');
  return { ok: true, message: 'Connexion NOEST réussie' };
}

/**
 * Create a new parcel / shipment in NOEST.
 */
export async function createParcel(input: NoestCreateParcelInput): Promise<NoestParcelResult> {
  const payload = {
    // Map our fields to NOEST's expected request body.
    // Field names may vary — adjust when you receive the official spec.
    recipient: {
      name: input.recipientName,
      phone: input.recipientPhone,
      wilaya: input.wilaya,
      commune: input.commune,
      address: input.address,
    },
    parcel: {
      description: input.description,
      pieces: input.pieces,
      weight: input.weightKg ?? 1,
      delivery_type: input.deliveryType,
    },
    payment: {
      collection_amount: input.collectionAmount,
      currency: 'DZD',
    },
    reference: input.orderReference,
    notes: input.notes,
    user_guid: USER_GUID,
  };

  const data = await noestFetch('POST', '/api/v1/parcels', payload);

  // Extract from response — adapt field names to NOEST's actual response
  const shipmentId  = data?.id ?? data?.shipment_id ?? data?.parcel_id ?? String(data?.tracking_number);
  const trackingNum = data?.tracking_number ?? data?.barcode ?? shipmentId;
  const rawStatus   = data?.status ?? 'created';

  return {
    shipmentId: String(shipmentId),
    trackingNumber: String(trackingNum),
    trackingUrl: `${BASE_URL}/track/${trackingNum}`,
    labelUrl: data?.label_url ?? data?.bordereau_url ?? `${BASE_URL}/api/v1/parcels/${shipmentId}/label`,
    status: NOEST_STATUS_MAP[rawStatus.toLowerCase()] ?? 'sent_to_noest',
    rawStatus,
  };
}

/**
 * Get current status of a shipment.
 */
export async function getParcelStatus(shipmentId: string): Promise<NoestStatusResult> {
  const data = await noestFetch('GET', `/api/v1/parcels/${shipmentId}`);
  const rawStatus = data?.status ?? 'unknown';
  return {
    shipmentId,
    trackingNumber: data?.tracking_number ?? shipmentId,
    status: NOEST_STATUS_MAP[rawStatus.toLowerCase()] ?? rawStatus,
    rawStatus,
    updatedAt: data?.updated_at ?? data?.last_update,
  };
}

/**
 * Cancel a shipment. Only possible if NOEST has not yet picked it up.
 * Returns true on success, false if the API does not support cancellation.
 */
export async function cancelParcel(shipmentId: string): Promise<{ cancelled: boolean; message: string }> {
  try {
    await noestFetch('DELETE', `/api/v1/parcels/${shipmentId}`);
    return { cancelled: true, message: 'Expédition annulée avec succès' };
  } catch (err: any) {
    if (err.message?.includes('405') || err.message?.includes('not supported')) {
      return { cancelled: false, message: "L'API NOEST ne supporte pas l'annulation pour ce colis" };
    }
    throw err;
  }
}

/**
 * Get the label/bordereau URL (PDF or redirect).
 * Some carriers return a PDF binary; others a redirect URL.
 */
export function getLabelUrl(shipmentId: string): string {
  return `${BASE_URL}/api/v1/parcels/${shipmentId}/label`;
}

/**
 * Returns true if NOEST is configured (env vars present).
 */
export function isNoestConfigured(): boolean {
  return !!(BASE_URL && API_TOKEN && USER_GUID);
}
