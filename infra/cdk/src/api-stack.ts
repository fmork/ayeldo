import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import { Cors, EndpointType, LambdaRestApi, SecurityPolicy } from 'aws-cdk-lib/aws-apigateway';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { ARecord, AaaaRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayDomain } from 'aws-cdk-lib/aws-route53-targets';
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

    // Bundle Lambda directly with NodejsFunction (esbuild)
    const apiEntry = path.resolve(
      __dirnameLocal,
      '../../../packages/api/src/functions/http-handler/handler.ts',
    );
    const tsconfigPath = path.resolve(__dirnameLocal, '../../../tsconfig.base.json');
    const handler = new NodejsFunction(this, 'ApiHandler', {
      entry: apiEntry,
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      bundling: {
        sourceMap: true,
        minify: true,
        format: OutputFormat.ESM,
        target: 'node20',
        tsconfig: tsconfigPath,
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: props.table.tableName,
        EVENTS_BUS_NAME: props.eventBus.eventBusName,
      },
    });

    // Permissions: API lambda can read/write table and put events
    props.table.grantReadWriteData(handler);
    props.eventBus.grantPutEventsTo(handler);

    // Custom domain setup (certificate + hosted zone) if configured
    let zone: IHostedZone | undefined;
    let apiCert: Certificate | undefined;
    if (props.domainConfig) {
      zone = HostedZone.fromLookup(this, 'ApiHostedZone', {
        domainName: props.domainConfig.baseDomain,
      });
      apiCert = new Certificate(this, 'ApiAcmCertificate', {
        domainName: props.domainConfig.apiHost,
        validation: CertificateValidation.fromDns(zone),
      });
    }

    const api = new LambdaRestApi(this, 'RestApi', {
      handler,
      proxy: true,
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        disableCache: false,
        maxAge: Duration.days(10),
      },
      ...(props.domainConfig && apiCert
        ? {
            domainName: {
              domainName: props.domainConfig.apiHost,
              certificate: apiCert,
              endpointType: EndpointType.REGIONAL,
              securityPolicy: SecurityPolicy.TLS_1_2,
              basePath: '',
            },
          }
        : {}),
    });

    // Route53 alias for custom domain
    if (props.domainConfig && api.domainName && zone) {
      const domainResource = api.domainName;
      const recordName = props.domainConfig.apiHost.replace(
        `.${props.domainConfig.baseDomain}`,
        '',
      );
      const target = RecordTarget.fromAlias(new ApiGatewayDomain(domainResource));
      new ARecord(this, 'ApiAliasA', { zone, recordName, target });
      new AaaaRecord(this, 'ApiAliasAAAA', { zone, recordName, target });
    }

    new CfnOutput(this, 'ApiEndpoint', { value: api.url });
  }
}
