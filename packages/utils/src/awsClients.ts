import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

let ddbClient: DynamoDBClient | undefined;
let s3Client: S3Client | undefined;
let ebClient: EventBridgeClient | undefined;

export function getDynamoClient(region: string): DynamoDBClient {
  if (!ddbClient) ddbClient = new DynamoDBClient({ region });
  return ddbClient;
}

export function getS3Client(region: string): S3Client {
  if (!s3Client) s3Client = new S3Client({ region });
  return s3Client;
}

export function getEventBridgeClient(region: string): EventBridgeClient {
  if (!ebClient) ebClient = new EventBridgeClient({ region });
  return ebClient;
}

