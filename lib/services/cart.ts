// lib/services/cart.ts
// Cart operations — add, remove, update, get, merge guest→user (§6)
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { carts, cartItems, products } from '@/lib/db/schema';

export interface CartItemView {
  id: string;
  productId: string;
  qty: number;
  product: {
    slug: string;
    nameEn: string;
    nameBn: string;
    genericName: string | null;
    dosageForm: string | null;
    packSize: string | null;
    mrp: number;
    salePrice: number;
    vatRate: string;
    requiresPrescription: boolean;
    requiresColdChain: boolean;
    isActive: boolean;
  };
}

export interface CartView {
  cartId: string;
  items: CartItemView[];
  itemCount: number;
}

/**
 * Find or create a cart for the given user or session.
 */
export async function findOrCreateCart(userId?: string, sessionId?: string): Promise<string> {
  if (!userId && !sessionId) {
    throw new Error('Either userId or sessionId is required.');
  }

  // Look for existing cart
  let existingCart;
  if (userId) {
    [existingCart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);
  } else if (sessionId) {
    [existingCart] = await db
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .limit(1);
  }

  if (existingCart) return existingCart.id;

  // Create new cart
  const [newCart] = await db
    .insert(carts)
    .values({
      userId: userId || null,
      sessionId: sessionId || null,
    })
    .returning({ id: carts.id });

  return newCart.id;
}

/**
 * Add a product to the cart (or increment qty if already present).
 */
export async function addToCart(cartId: string, productId: string, qty: number = 1) {
  if (qty < 1) throw new Error('Quantity must be at least 1.');

  // Check if item already in cart
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .update(cartItems)
      .set({ qty: existing.qty + qty })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ cartId, productId, qty });
  }

  // Touch cart updatedAt
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/**
 * Update the quantity of a cart item. If qty is 0, remove it.
 */
export async function updateCartItemQty(cartId: string, itemId: string, qty: number) {
  if (qty <= 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  } else {
    await db
      .update(cartItems)
      .set({ qty })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/**
 * Remove an item from the cart entirely.
 */
export async function removeFromCart(cartId: string, itemId: string) {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}

/**
 * Get the full cart with product details.
 */
export async function getCartView(cartId: string): Promise<CartView> {
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      qty: cartItems.qty,
      product: {
        slug: products.slug,
        nameEn: products.nameEn,
        nameBn: products.nameBn,
        genericName: products.genericName,
        dosageForm: products.dosageForm,
        packSize: products.packSize,
        mrp: products.mrp,
        salePrice: products.salePrice,
        vatRate: products.vatRate,
        requiresPrescription: products.requiresPrescription,
        requiresColdChain: products.requiresColdChain,
        isActive: products.isActive,
      },
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  return {
    cartId,
    items,
    itemCount: items.reduce((sum, i) => sum + i.qty, 0),
  };
}

/**
 * Merge a guest session cart into a logged-in user's cart on login (§6).
 * Guest items are added to the user's cart; duplicates increment qty.
 */
export async function mergeGuestCart(sessionId: string, userId: string) {
  // Find guest cart
  const [guestCart] = await db
    .select()
    .from(carts)
    .where(eq(carts.sessionId, sessionId))
    .limit(1);

  if (!guestCart) return;

  // Find or create user cart
  const userCartId = await findOrCreateCart(userId);

  // Get guest items
  const guestItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart.id));

  // Merge each guest item
  for (const gItem of guestItems) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, userCartId), eq(cartItems.productId, gItem.productId)))
      .limit(1);

    if (existing) {
      await db
        .update(cartItems)
        .set({ qty: existing.qty + gItem.qty })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: userCartId,
        productId: gItem.productId,
        qty: gItem.qty,
      });
    }
  }

  // Delete guest cart and its items
  await db.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await db.delete(carts).where(eq(carts.id, guestCart.id));
}

/**
 * Clear all items from a cart (e.g. after order placement).
 */
export async function clearCart(cartId: string) {
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId));
}
