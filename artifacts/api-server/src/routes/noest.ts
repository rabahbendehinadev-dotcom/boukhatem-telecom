/**
 * NOEST Express routes — all under /api/admin/noest
 * All endpoints require valid admin session.
 * Credentials are never exposed to the client.
 */

import { Router } from 'express';
import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { db, ordersTable } from '@workspace/db';
import { requireAdminSession, logActivity, getIp } from '../lib/admin-auth';
import * as noest from '../lib/noest-service';

const router = Router();

// ── Delivery status labels ────────────────────────────────────────────────────

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  sent_to_noest:    'Envoyé à NOEST',
  en_preparation:   'En préparation',
  expedie:          'Expédié',
  en_transit:       'En transit',
  en_livraison:     'En livraison',
  livre:            'Livré',
  echec_livraison:  'Échec de livraison',
  retour:           'Retour',
  annule:           'Annulé',
};

// ── GET /api/admin/noest/test-connection ─────────────────────────────────────
router.get('/api/admin/noest/test-connection', requireAdminSession, async (req, res) => {
  try {
    if (!noest.isNoestConfigured()) {
      return res.status(503).json({ ok: false, message: 'NOEST non configuré — vérifiez NOEST_API_BASE_URL, NOEST_API_TOKEN, NOEST_USER_GUID' });
    }
    const result = await noest.testConnection();
    return res.json(result);
  } catch (err: any) {
    // Never expose the token in the error
    const safeMessage = err.message?.replace(process.env.NOEST_API_TOKEN ?? '__REDACTED__', '[TOKEN]') ?? 'Erreur de connexion';
    return res.status(502).json({ ok: false, message: safeMessage });
  }
});

// ── GET /api/admin/noest/status-labels ────────────────────────────────────────
router.get('/api/admin/noest/status-labels', requireAdminSession, (_req, res) => {
  res.json(DELIVERY_STATUS_LABELS);
});

// ── GET /api/admin/noest/shipments ────────────────────────────────────────────
router.get('/api/admin/noest/shipments', requireAdminSession, async (_req, res) => {
  try {
    const shipments = await db
      .select()
      .from(ordersTable)
      .where(isNotNull(ordersTable.noestShipmentId))
      .orderBy(desc(ordersTable.sentToCarrierAt));
    return res.json(shipments);
  } catch (err: any) {
    console.error('[NOEST] list shipments error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/admin/noest/shipments/:orderId ──────────────────────────────────
// Send an order to NOEST. Prevents duplicate dispatch.
router.post('/api/admin/noest/shipments/:orderId', requireAdminSession, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId));
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID de commande invalide' });

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    // Prevent duplicate dispatch
    if (order.noestShipmentId) {
      return res.status(409).json({
        error: 'Cette commande a déjà été envoyée à NOEST',
        shipmentId: order.noestShipmentId,
        trackingNumber: order.trackingNumber,
      });
    }

    if (!noest.isNoestConfigured()) {
      return res.status(503).json({ error: 'NOEST non configuré — vérifiez les variables d\'environnement' });
    }

    const addr = order.shippingAddress as any;
    const items = order.items as any[];

    // Build the parcel description from order items
    const description = items
      .map((i: any) => `${i.name} x${i.quantity}`)
      .join(', ')
      .slice(0, 250);

    const totalPieces = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 1), 0);

    const {
      deliveryType = noest.NOEST_DELIVERY_TYPES.HOME,
      weightKg,
      notes,
    } = req.body;

    const result = await noest.createParcel({
      recipientName: addr.fullName ?? addr.name ?? (order as any).userName ?? 'Client',
      recipientPhone: addr.phone ?? '',
      wilaya: addr.wilaya ?? '',
      commune: addr.commune ?? '',
      address: addr.address ?? '',
      description,
      pieces: totalPieces,
      collectionAmount: order.paymentMethod === 'cash_on_delivery' ? Number(order.total) : 0,
      deliveryType,
      weightKg,
      notes: notes ?? order.notes ?? undefined,
      orderReference: `CMD-${order.id}`,
    });

    // Persist all NOEST fields
    await db.update(ordersTable).set({
      deliveryProvider: 'noest',
      noestShipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
      labelUrl: result.labelUrl,
      deliveryStatus: result.status,
      sentToCarrierAt: new Date(),
      lastTrackingSyncAt: new Date(),
    }).where(eq(ordersTable.id, orderId));

    await logActivity(
      req.adminUser?.id ?? null,
      req.adminUser?.fullName ?? 'Admin',
      'noest_send',
      'order',
      orderId,
      null,
      { shipmentId: result.shipmentId, trackingNumber: result.trackingNumber },
      getIp(req),
    );

    return res.json({
      success: true,
      shipmentId: result.shipmentId,
      trackingNumber: result.trackingNumber,
      trackingUrl: result.trackingUrl,
      labelUrl: result.labelUrl,
      deliveryStatus: result.status,
    });
  } catch (err: any) {
    if (err.status === 409) {
      return res.status(409).json({ error: err.message });
    }
    console.error('[NOEST] send shipment error:', err.message);
    return res.status(502).json({ error: `Erreur NOEST: ${err.message}` });
  }
});

// ── POST /api/admin/noest/shipments/:orderId/sync ─────────────────────────────
// Manually sync a single shipment status from NOEST.
router.post('/api/admin/noest/shipments/:orderId/sync', requireAdminSession, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId));
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order || !order.noestShipmentId) {
      return res.status(404).json({ error: 'Aucune expédition NOEST pour cette commande' });
    }

    const statusResult = await noest.getParcelStatus(order.noestShipmentId);

    const updates: Partial<typeof ordersTable.$inferInsert> = {
      deliveryStatus: statusResult.status,
      lastTrackingSyncAt: new Date(),
    };

    // Auto-update order status on delivery
    if (statusResult.status === 'livre' && order.status !== 'delivered') {
      (updates as any).status = 'delivered';
      (updates as any).deliveredAt = new Date();
      // Auto-confirm payment on cash on delivery
      if (order.paymentMethod === 'cash_on_delivery' && order.paymentStatus !== 'confirmed') {
        (updates as any).paymentStatus = 'confirmed';
      }
    }

    await db.update(ordersTable).set(updates).where(eq(ordersTable.id, orderId));

    return res.json({ success: true, status: statusResult.status, rawStatus: statusResult.rawStatus });
  } catch (err: any) {
    console.error('[NOEST] sync error:', err.message);
    return res.status(502).json({ error: `Erreur NOEST: ${err.message}` });
  }
});

// ── POST /api/admin/noest/sync-all ────────────────────────────────────────────
// Sync all active (non-final) shipments. Rate-limited: max one call per 5 min.
let lastSyncAll = 0;
router.post('/api/admin/noest/sync-all', requireAdminSession, async (_req, res) => {
  const now = Date.now();
  if (now - lastSyncAll < 5 * 60_000) {
    return res.status(429).json({ error: 'Synchronisation déjà effectuée récemment. Attendez 5 minutes.' });
  }
  lastSyncAll = now;

  try {
    const FINAL_STATUSES = ['livre', 'retour', 'annule'];
    const activeShipments = await db
      .select({ id: ordersTable.id, noestShipmentId: ordersTable.noestShipmentId })
      .from(ordersTable)
      .where(and(
        isNotNull(ordersTable.noestShipmentId),
        // skip final statuses — Drizzle doesn't have notInArray for optional text easily, so filter in-memory
      ));

    const toSync = activeShipments.filter(s => !FINAL_STATUSES.includes((s as any).deliveryStatus ?? ''));

    let updated = 0;
    let failed = 0;

    for (const shipment of toSync) {
      try {
        const statusResult = await noest.getParcelStatus(shipment.noestShipmentId!);
        const updates: Record<string, any> = {
          deliveryStatus: statusResult.status,
          lastTrackingSyncAt: new Date(),
        };
        if (statusResult.status === 'livre') {
          updates.status = 'delivered';
          updates.deliveredAt = new Date();
        }
        await db.update(ordersTable).set(updates).where(eq(ordersTable.id, shipment.id));
        updated++;
      } catch {
        failed++;
      }
      // Polite delay between requests
      await new Promise(r => setTimeout(r, 300));
    }

    return res.json({ success: true, total: toSync.length, updated, failed });
  } catch (err: any) {
    console.error('[NOEST] sync-all error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /api/admin/noest/shipments/:orderId ────────────────────────────────
// Cancel a shipment at NOEST (if API supports it).
router.delete('/api/admin/noest/shipments/:orderId', requireAdminSession, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId));
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order || !order.noestShipmentId) {
      return res.status(404).json({ error: 'Aucune expédition NOEST pour cette commande' });
    }

    const result = await noest.cancelParcel(order.noestShipmentId);

    if (result.cancelled) {
      await db.update(ordersTable).set({ deliveryStatus: 'annule' }).where(eq(ordersTable.id, orderId));
      await logActivity(
        req.adminUser?.id ?? null,
        req.adminUser?.fullName ?? 'Admin',
        'noest_cancel',
        'order',
        orderId,
        null,
        { shipmentId: order.noestShipmentId },
        getIp(req),
      );
    }

    return res.json(result);
  } catch (err: any) {
    console.error('[NOEST] cancel error:', err.message);
    return res.status(502).json({ error: `Erreur NOEST: ${err.message}` });
  }
});

// ── GET /api/admin/noest/shipments/:orderId/label ─────────────────────────────
// Proxy the bordereau PDF from NOEST (never exposing the token to frontend).
router.get('/api/admin/noest/shipments/:orderId/label', requireAdminSession, async (req, res) => {
  const orderId = parseInt(String(req.params.orderId));
  if (isNaN(orderId)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order || !order.noestShipmentId) {
      return res.status(404).json({ error: 'Aucune expédition NOEST pour cette commande' });
    }

    const labelUrl = noest.getLabelUrl(order.noestShipmentId);
    const upstream = await fetch(labelUrl, {
      headers: {
        Authorization: `Bearer ${process.env.NOEST_API_TOKEN}`,
        'X-User-Guid': process.env.NOEST_USER_GUID ?? '',
        Accept: 'application/pdf,*/*',
      },
    });

    if (!upstream.ok) {
      // Fall back: redirect to the stored label URL
      if (order.labelUrl) return res.redirect(order.labelUrl);
      return res.status(upstream.status).json({ error: 'Bordereau non disponible' });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="bordereau-cmd-${orderId}.pdf"`);

    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('[NOEST] label error:', err.message);
    return res.status(502).json({ error: 'Erreur lors du téléchargement du bordereau' });
  }
});

// ── POST /api/admin/noest/webhook ─────────────────────────────────────────────
// Receive status updates pushed by NOEST (if webhook is configured).
router.post('/api/admin/noest/webhook', async (req, res) => {
  const secret = process.env.NOEST_WEBHOOK_SECRET;
  if (secret) {
    const sigRaw = req.headers['x-noest-signature'] ?? req.headers['x-webhook-signature'];
    const signature = Array.isArray(sigRaw) ? sigRaw[0] : sigRaw;
    if (!signature || signature !== secret) {
      return res.status(401).json({ error: 'Signature invalide' });
    }
  }

  try {
    const { shipment_id, tracking_number, status } = req.body ?? {};
    if (!shipment_id && !tracking_number) {
      return res.status(400).json({ error: 'Payload invalide' });
    }

    // Find the order by NOEST shipment ID or tracking number
    const orders = await db
      .select()
      .from(ordersTable)
      .where(
        shipment_id
          ? eq(ordersTable.noestShipmentId, String(shipment_id))
          : eq(ordersTable.trackingNumber, String(tracking_number))
      );

    if (!orders.length) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const order = orders[0];
    const mappedStatus = noest.NOEST_STATUS_MAP[String(status ?? '').toLowerCase()] ?? String(status);

    const updates: Record<string, any> = {
      deliveryStatus: mappedStatus,
      lastTrackingSyncAt: new Date(),
    };

    if (mappedStatus === 'livre' && order.status !== 'delivered') {
      updates.status = 'delivered';
      updates.deliveredAt = new Date();
      if (order.paymentMethod === 'cash_on_delivery' && order.paymentStatus !== 'confirmed') {
        updates.paymentStatus = 'confirmed';
      }
    }

    await db.update(ordersTable).set(updates).where(eq(ordersTable.id, order.id));

    console.info(`[NOEST webhook] order ${order.id} → ${mappedStatus}`);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[NOEST webhook] error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
