import { MediaController } from '../controllers/mediaController';
import { OrderController } from '../controllers/orderController';
import { PaymentController } from '../controllers/paymentController';
import { env, logWriter } from './config';
import {
  albumRepo,
  cartRepo,
  download,
  eventPublisher,
  imageRepo,
  orderRepo,
  payments,
  priceListRepo,
} from './infrastructure';

// Core controllers that don't depend on OIDC/authentication
export const orderController = new OrderController({
  baseUrl: '',
  logWriter,
  cartRepo,
  priceListRepo,
  orderRepo,
  download,
});

export const paymentController = new PaymentController({
  baseUrl: '',
  logWriter,
  orderRepo,
  payments,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  publisher: eventPublisher,
});

export const mediaController = new MediaController({
  baseUrl: '',
  logWriter,
  albumRepo,
  imageRepo,
});
