export const CartState = {
  Active: 'active',
  Expired: 'expired',
  CheckedOut: 'checked_out',
} as const;

export type CartState = typeof CartState[keyof typeof CartState];

export const OrderState = {
  Created: 'created',
  PendingPayment: 'pending_payment',
  Paid: 'paid',
  Failed: 'failed',
  Fulfilled: 'fulfilled',
} as const;

export type OrderState = typeof OrderState[keyof typeof OrderState];

