import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import path from 'path';
import { fileURLToPath } from 'url';

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const __filename = fileURLToPath(import.meta.url);
    const __dirnameLocal = path.dirname(__filename);

    const handler = new NodejsFunction(this, 'ApiHandler', {
      entry: path.join(__dirnameLocal, '../../../packages/api/src/functions/http-handler/handler.ts'),
      handler: 'main',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      bundling: {
        target: 'node20',
        minify: true,
        sourceMap: true,
        // Ensure monorepo paths resolve; include workspace packages
        // Adjust as needed depending on your packaging strategy
        externalModules: [],
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

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
