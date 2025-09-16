import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import type { S3Client } from '@aws-sdk/client-s3';
export declare function getDynamoClient(region: string): DynamoDBClient;
export declare function getS3Client(region: string): S3Client;
export declare function getEventBridgeClient(region: string): EventBridgeClient;
//# sourceMappingURL=awsClients.d.ts.map
