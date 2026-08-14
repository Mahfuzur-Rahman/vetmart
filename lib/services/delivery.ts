// lib/services/delivery.ts
// Delivery zone rate lookup (§6, §14.2)
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deliveryZones } from '@/lib/db/schema';

export interface DeliveryQuote {
  zoneId: string;
  rate: number; // paisa
  etaDays: number;
  codEnabled: boolean;
  coldChainEnabled: boolean;
}

/**
 * Look up the delivery rate for a given division + district.
 * Falls back to division-level rate if no district-specific entry exists.
 */
export async function getDeliveryQuote(
  division: string,
  district: string
): Promise<DeliveryQuote | null> {
  // Try district-specific match first
  const [zone] = await db
    .select()
    .from(deliveryZones)
    .where(
      and(
        eq(deliveryZones.division, division),
        eq(deliveryZones.district, district),
        eq(deliveryZones.isActive, true)
      )
    )
    .limit(1);

  if (zone) {
    return {
      zoneId: zone.id,
      rate: zone.rate,
      etaDays: zone.etaDays,
      codEnabled: zone.codEnabled,
      coldChainEnabled: zone.coldChainEnabled,
    };
  }

  // Fall back to any zone in the division
  const [divisionZone] = await db
    .select()
    .from(deliveryZones)
    .where(
      and(
        eq(deliveryZones.division, division),
        eq(deliveryZones.isActive, true)
      )
    )
    .limit(1);

  if (divisionZone) {
    return {
      zoneId: divisionZone.id,
      rate: divisionZone.rate,
      etaDays: divisionZone.etaDays,
      codEnabled: divisionZone.codEnabled,
      coldChainEnabled: divisionZone.coldChainEnabled,
    };
  }

  return null;
}
