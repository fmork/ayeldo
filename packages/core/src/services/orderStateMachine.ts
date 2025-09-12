import type { OrderState } from '../types';
import { InvalidStateTransitionError } from '../errors';

export const OrderAction = {
  StartPayment: 'start_payment',
  PaymentSucceeded: 'payment_succeeded',
  PaymentFailed: 'payment_failed',
  Fulfill: 'fulfill',
} as const;

export type OrderAction = typeof OrderAction[keyof typeof OrderAction];

export function nextOrderState(current: OrderState, action: OrderAction): OrderState {
  switch (current) {
    case 'created': {
      if (action === OrderAction.StartPayment) return 'pending_payment';
      break;
    }
    case 'pending_payment': {
      if (action === OrderAction.PaymentSucceeded) return 'paid';
      if (action === OrderAction.PaymentFailed) return 'failed';
      break;
    }
    case 'paid': {
      if (action === OrderAction.Fulfill) return 'fulfilled';
      break;
    }
    case 'failed':
    case 'fulfilled': {
      // terminal states
      break;
    }
    default:
      break;
  }
  throw new InvalidStateTransitionError(current, action);
}

