import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { S3Client } from '@aws-sdk/client-s3';
import AWSXRay from 'aws-xray-sdk-core';

let ddbClient: DynamoDBClient | undefined;
let s3Client: S3Client | undefined;
let ebClient: EventBridgeClient | undefined;

export function getDynamoClient(region: string): DynamoDBClient {
  if (!ddbClient) {
    ddbClient = new DynamoDBClient({ region });
    // Enable X-Ray tracing for DynamoDB operations
    if (process.env['AWS_XRAY_TRACING_NAME'] || process.env['_X_AMZN_TRACE_ID']) {
      ddbClient = AWSXRay.captureAWSv3Client(ddbClient);
    }
  }
  return ddbClient;
}

export function getS3Client(region: string): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region });
    // Enable X-Ray tracing for S3 operations
    if (process.env['AWS_XRAY_TRACING_NAME'] || process.env['_X_AMZN_TRACE_ID']) {
      s3Client = AWSXRay.captureAWSv3Client(s3Client);
    }
  }
  return s3Client;
}

export function getEventBridgeClient(region: string): EventBridgeClient {
  if (!ebClient) {
    ebClient = new EventBridgeClient({ region });
    // Enable X-Ray tracing for EventBridge operations
    if (process.env['AWS_XRAY_TRACING_NAME'] || process.env['_X_AMZN_TRACE_ID']) {
      ebClient = AWSXRay.captureAWSv3Client(ebClient);
    }
  }
  return ebClient;
}
