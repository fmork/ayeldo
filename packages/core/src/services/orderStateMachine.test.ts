import { nextOrderState, OrderAction } from './orderStateMachine';

describe('OrderStateMachine', () => {
  it('allows Created -> PendingPayment', () => {
    expect(nextOrderState('created', OrderAction.StartPayment)).toBe(
      'pending_payment',
    );
  });

  it('allows PendingPayment -> Paid or Failed', () => {
    expect(
      nextOrderState('pending_payment', OrderAction.PaymentSucceeded),
    ).toBe('paid');
    expect(nextOrderState('pending_payment', OrderAction.PaymentFailed)).toBe(
      'failed',
    );
  });

  it('allows Paid -> Fulfilled', () => {
    expect(nextOrderState('paid', OrderAction.Fulfill)).toBe('fulfilled');
  });

  it('rejects invalid transitions', () => {
    expect(() => nextOrderState('created', OrderAction.Fulfill)).toThrow(
      /Invalid transition/,
    );
    expect(() => nextOrderState('paid', OrderAction.StartPayment)).toThrow(
      /Invalid transition/,
    );
  });
});

