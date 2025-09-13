import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
let ddbClient;
let s3Client;
let ebClient;
export function getDynamoClient(region) {
    if (!ddbClient)
        ddbClient = new DynamoDBClient({ region });
    return ddbClient;
}
export function getS3Client(region) {
    if (!s3Client)
        s3Client = new S3Client({ region });
    return s3Client;
}
export function getEventBridgeClient(region) {
    if (!ebClient)
        ebClient = new EventBridgeClient({ region });
    return ebClient;
}
//# sourceMappingURL=awsClients.js.map