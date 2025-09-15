import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  AccessLogFormat,
  Cors,
  EndpointType,
  LambdaRestApi,
  LogGroupLogDestination,
  MethodLoggingLevel,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import type { EventBus } from 'aws-cdk-lib/aws-events';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
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
    // Prepare optional BFF/OIDC env vars from the build environment
    const maybe = (k: string): string | undefined => {
      const v = process.env[k];
      return v && v.trim().length > 0 ? v : undefined;
    };
    const optionalEnv: Record<string, string> = {};
    const envCandidates: Record<string, string | undefined> = {
      OIDC_ISSUER_URL: maybe('FMORK_SITE_OIDC_AUTHORITY'),
      OIDC_AUTH_URL: maybe('FMORK_SITE_OIDC_AUTH_URL'),
      OIDC_TOKEN_URL: maybe('FMORK_SITE_OIDC_TOKEN_URL'),
      OIDC_JWKS_URL: maybe('FMORK_SITE_OIDC_JWKS_URL'),
      OIDC_CLIENT_ID: maybe('FMORK_SITE_OIDC_CLIENT_ID'),
      OIDC_CLIENT_SECRET: maybe('FMORK_SITE_OIDC_CLIENT_SECRET'),
      OIDC_SCOPES: maybe('FMORK_SITE_OIDC_SCOPES'),
      OIDC_REDIRECT_URI: maybe('FMORK_SITE_OIDC_REDIRECT_URI'),
      SESSION_ENC_KEY: maybe('FMORK_SITE_SESSION_ENC_KEY'),
      BFF_JWT_SECRET: maybe('FMORK_SITE_BFF_JWT_SECRET'),
    };
    for (const [k, v] of Object.entries(envCandidates)) {
      if (v) optionalEnv[k] = v;
    }

    // Compute API_BASE_URL if domain is configured
    const computedApiBaseUrl = props.domainConfig
      ? `https://${props.domainConfig.apiHost}`
      : undefined;
    if (computedApiBaseUrl) optionalEnv['API_BASE_URL'] = computedApiBaseUrl;

    const handler = new NodejsFunction(this, 'ApiHandler', {
      entry: apiEntry,
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      logRetention: RetentionDays.ONE_MONTH,
      bundling: {
        sourceMap: true,
        minify: true,
        format: OutputFormat.CJS,
        target: 'node20',
        tsconfig: tsconfigPath,
      },
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: props.table.tableName,
        EVENTS_BUS_NAME: props.eventBus.eventBusName,
        ...optionalEnv,
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

    // Access logs LogGroup with 30-day retention
    const accessLogGroup = new LogGroup(this, 'ApiAccessLogs', {
      retention: RetentionDays.ONE_MONTH,
    });

    const api = new LambdaRestApi(this, 'RestApi', {
      handler,
      proxy: true,
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new LogGroupLogDestination(accessLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
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
