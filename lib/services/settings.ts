// lib/services/settings.ts
// Platform configuration & shipping settings backed by PostgreSQL settings table (§6, §14.3)
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema/system';
import { eq } from 'drizzle-orm';

export interface ShippingSettings {
  /**
   * Whether delivery fee is charged to customers.
   * Default is false (Free delivery nationwide).
   */
  deliveryChargeEnabled: boolean;
  /** Delivery fee for Dhaka city zone in integer paisa (e.g. 7000 = ৳70) */
  dhakaRate: number;
  /** Delivery fee outside Dhaka zone in integer paisa (e.g. 13000 = ৳130) */
  outsideRate: number;
  /** Cold chain insulated packaging charge in integer paisa (e.g. 3000 = ৳30) */
  coldChainFee: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  deliveryChargeEnabled: false, // Default is 0 / Free delivery
  dhakaRate: 7000,              // ৳70.00
  outsideRate: 13000,           // ৳130.00
  coldChainFee: 3000,           // ৳30.00
};

const SHIPPING_KEY = 'shipping_config';

/**
 * Fetch current shipping configuration from the database.
 * Falls back safely to DEFAULT_SHIPPING_SETTINGS (free delivery).
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SHIPPING_KEY))
      .limit(1);

    if (row && typeof row.value === 'object' && row.value !== null) {
      const val = row.value as Record<string, unknown>;
      return {
        deliveryChargeEnabled: typeof val.deliveryChargeEnabled === 'boolean'
          ? val.deliveryChargeEnabled
          : false,
        dhakaRate: typeof val.dhakaRate === 'number' ? val.dhakaRate : DEFAULT_SHIPPING_SETTINGS.dhakaRate,
        outsideRate: typeof val.outsideRate === 'number' ? val.outsideRate : DEFAULT_SHIPPING_SETTINGS.outsideRate,
        coldChainFee: typeof val.coldChainFee === 'number' ? val.coldChainFee : DEFAULT_SHIPPING_SETTINGS.coldChainFee,
      };
    }
  } catch (err) {
    console.warn('Could not read shipping settings from database, using defaults:', err);
  }

  return { ...DEFAULT_SHIPPING_SETTINGS };
}

/**
 * Update shipping configuration in the PostgreSQL settings table.
 */
export async function updateShippingSettings(
  input: Partial<ShippingSettings>,
  adminId?: string
): Promise<ShippingSettings> {
  const current = await getShippingSettings();
  const updated: ShippingSettings = {
    deliveryChargeEnabled: input.deliveryChargeEnabled !== undefined
      ? Boolean(input.deliveryChargeEnabled)
      : current.deliveryChargeEnabled,
    dhakaRate: typeof input.dhakaRate === 'number' ? Math.round(input.dhakaRate) : current.dhakaRate,
    outsideRate: typeof input.outsideRate === 'number' ? Math.round(input.outsideRate) : current.outsideRate,
    coldChainFee: typeof input.coldChainFee === 'number' ? Math.round(input.coldChainFee) : current.coldChainFee,
  };

  await db
    .insert(settings)
    .values({
      key: SHIPPING_KEY,
      value: updated,
      group: 'shipping',
      updatedBy: adminId || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: updated,
        updatedBy: adminId || null,
        updatedAt: new Date(),
      },
    });

  return updated;
}
