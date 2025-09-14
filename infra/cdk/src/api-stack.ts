import { Duration, Stack, CfnOutput } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import path from 'path';
import { fileURLToPath } from 'url';

export interface ApiStackProps extends StackProps {
  readonly table: Table;
  readonly eventBus: EventBus;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);

    // Use prebuilt artifact from Option A bundling
    const assetsDir = path.join(__dirnameLocal, '../../assets/lambdas/api-http-handler');
    const handler = new lambda.Function(this, 'ApiHandler', {
      code: lambda.Code.fromAsset(assetsDir),
      handler: 'index.main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: props.table.tableName,
        EVENTS_BUS_NAME: props.eventBus.eventBusName,
      },
    });

    // Permissions: API lambda can read/write table and put events
    props.table.grantReadWriteData(handler);
    props.eventBus.grantPutEventsTo(handler);

    const integration = new HttpLambdaIntegration('ApiIntegration', handler);

    const api = new HttpApi(this, 'HttpApi', {
      createDefaultStage: true,
      corsPreflight: {
        allowCredentials: true,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      },
    });

    // Proxy all routes to Lambda
    api.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });

    new CfnOutput(this, 'ApiEndpoint', { value: api.apiEndpoint });
  }
}
