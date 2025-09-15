import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  ApiMapping,
  CorsHttpMethod,
  DomainName,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import type { Construct } from 'constructs';
import path from 'path';
import type { DomainConfig } from './domain';

export interface ApiStackProps extends StackProps {
  readonly table: Table;
  readonly eventBus: EventBus;
  readonly domainConfig?: DomainConfig;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const __dirnameLocal = __dirname;

    // Use prebuilt artifact from Option A bundling
    const assetsDir = path.resolve(__dirnameLocal, '../assets/lambdas/api-http-handler');
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
        allowCredentials: false,
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

    // Custom domain for HTTP API + Route53 alias records
    if (props.domainConfig) {
      const zone = HostedZone.fromLookup(this, 'ApiHostedZone', {
        domainName: props.domainConfig.baseDomain,
      });

      // Regional ACM certificate is required for API Gateway custom domain (must be in same region)
      const apiCert = new Certificate(this, 'ApiAcmCertificate', {
        domainName: props.domainConfig.apiHost,
        validation: CertificateValidation.fromDns(zone),
      });

      const customDomain = new DomainName(this, 'ApiCustomDomain', {
        domainName: props.domainConfig.apiHost,
        certificate: apiCert,
      });

      const defaultStage = api.defaultStage;
      if (!defaultStage) {
        throw new Error('HTTP API default stage was not created');
      }
      new ApiMapping(this, 'ApiDefaultMapping', {
        api,
        domainName: customDomain,
        stage: defaultStage,
      });

      const recordName = props.domainConfig.apiHost.replace(
        `.${props.domainConfig.baseDomain}`,
        '',
      );
      const target = RecordTarget.fromAlias(
        new ApiGatewayv2DomainProperties(
          customDomain.regionalDomainName,
          customDomain.regionalHostedZoneId,
        ),
      );
      new ARecord(this, 'ApiAliasA', { zone, recordName, target });
      new AaaaRecord(this, 'ApiAliasAAAA', { zone, recordName, target });
    }

    new CfnOutput(this, 'ApiEndpoint', { value: api.apiEndpoint });
  }
}
