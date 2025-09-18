import type { FC } from 'react';
import ComingSoonMessage from '../components/comingSoonMessage';

const OrdersPage: FC = () => {
  return (
    <ComingSoonMessage
      title="Orders"
      description="Track purchase flow, fulfillment status, and customer communications from one place."
    />
  );
};

export default OrdersPage;
