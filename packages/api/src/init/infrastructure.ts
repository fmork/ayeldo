import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { AxiosHttpClient } from '@ayeldo/backend-core';
import {
  AlbumRepoDdb,
  CartRepoDdb,
  DdbDocumentClientAdapter,
  EventBridgePublisher,
  ImageRepoDdb,
  OrderRepoDdb,
  PriceListRepoDdb,
} from '@ayeldo/infra-aws';
import { getEventBridgeClient } from '@ayeldo/utils';
import { StripePaymentProviderFake } from '../payments/stripePaymentProviderFake';
import { SignedUrlProviderFake } from '../storage/signedUrlProviderFake';
import { logWriter } from './config';

// DynamoDB setup
const tableName = process.env['TABLE_NAME'] || 'AppTable';
const region = process.env['AWS_REGION'] || 'us-east-1';
const eventBusName = process.env['EVENTS_BUS_NAME'] || 'default';
const ddbEndpoint = process.env['DDB_ENDPOINT'];

export const ddb = new DdbDocumentClientAdapter({
  region,
  ...(ddbEndpoint ? { endpoint: ddbEndpoint } : {}),
  logger: logWriter,
});

// Repositories
export const cartRepo = new CartRepoDdb({ tableName, client: ddb });
export const priceListRepo = new PriceListRepoDdb({ tableName, client: ddb });
export const orderRepo = new OrderRepoDdb({ tableName, client: ddb });
export const albumRepo = new AlbumRepoDdb({ tableName, client: ddb });
export const imageRepo = new ImageRepoDdb({ tableName, client: ddb });

// Event publisher (EventBridge)
const ebClient = getEventBridgeClient(region) as unknown as EventBridgeClient;
export const eventPublisher = new EventBridgePublisher({ client: ebClient, eventBusName });

// HTTP client for API calls
export const httpClient = new AxiosHttpClient({ logWriter });

// Payments provider (Stripe fake)
export const payments = new StripePaymentProviderFake();

// Download URL provider (fake)
export const download = new SignedUrlProviderFake();
