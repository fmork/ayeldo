import { SiteConfiguration } from '@ayeldo/core';
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
  public readonly httpHandlerFunction: NodejsFunction;
  public readonly restApi: LambdaRestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const __dirnameLocal = __dirname;

    // Bundle Lambda directly with NodejsFunction (esbuild)
    const apiEntry = path.resolve(
      __dirnameLocal,
      '../../../packages/api/src/functions/http-handler/handler.ts',
    );
    const tsconfigPath = path.resolve(__dirnameLocal, '../../../tsconfig.base.json');

    // Helper to get optional environment variables
    const maybe = (k: string): string | undefined => {
      const v = process.env[k];
      return v && v.trim().length > 0 ? v : undefined;
    };

    // Compute origins for SiteConfiguration
    const computedApiHost = props.domainConfig ? props.domainConfig.apiHost : 'localhost:3000';
    const computedWebHost = props.domainConfig ? props.domainConfig.webHost : 'localhost:3001';
    const apiOrigin = `https://${computedApiHost}`;
    const webOrigin = `https://${computedWebHost}`;

    // Create SiteConfiguration to manage OIDC and other config. Historically this project
    // used the acronym "BFF" for a backend-for-frontend service. The responsibilities are
    // now served by the HTTP API; we keep the `bffOrigin` property for backward compatibility
    // but it represents the API origin.
    const siteConfig = new SiteConfiguration({
      webOrigin,
      bffOrigin: apiOrigin, // API origin (keeps historical bffOrigin prop for compat)
      ...(maybe('FMORK_SITE_OIDC_AUTHORITY') && {
        oidcAuthority: maybe('FMORK_SITE_OIDC_AUTHORITY') as string,
      }),
      ...(maybe('FMORK_SITE_OIDC_CLIENT_ID') && {
        oidcClientId: maybe('FMORK_SITE_OIDC_CLIENT_ID') as string,
      }),
      ...(maybe('FMORK_SITE_OIDC_CLIENT_SECRET') && {
        oidcClientSecret: maybe('FMORK_SITE_OIDC_CLIENT_SECRET') as string,
      }),
      ...(maybe('FMORK_SITE_SESSION_ENC_KEY') && {
        sessionEncKey: maybe('FMORK_SITE_SESSION_ENC_KEY') as string,
      }),
      ...(maybe('FMORK_SITE_BFF_JWT_SECRET') && {
        bffJwtSecret: maybe('FMORK_SITE_BFF_JWT_SECRET') as string,
      }),
    });

    // Get environment variables for Lambda from SiteConfiguration
    const lambdaEnv = siteConfig.toLambdaEnvironment();

    const handler = new NodejsFunction(this, 'ApiHandler', {
      entry: apiEntry,
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: Duration.seconds(15),
      logRetention: RetentionDays.ONE_MONTH,
      tracing: lambda.Tracing.ACTIVE,
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
        ...lambdaEnv,
        // Allow explicit overrides for provider-specific endpoints and redirect URI
        ...(maybe('FMORK_SITE_OIDC_AUTH_URL') && {
          OIDC_AUTH_URL: maybe('FMORK_SITE_OIDC_AUTH_URL') as string,
        }),
        ...(maybe('FMORK_SITE_OIDC_TOKEN_URL') && {
          OIDC_TOKEN_URL: maybe('FMORK_SITE_OIDC_TOKEN_URL') as string,
        }),
        ...(maybe('FMORK_SITE_OIDC_JWKS_URL') && {
          OIDC_JWKS_URL: maybe('FMORK_SITE_OIDC_JWKS_URL') as string,
        }),
        ...(maybe('FMORK_SITE_OIDC_REDIRECT_URI') && {
          OIDC_REDIRECT_URI: maybe('FMORK_SITE_OIDC_REDIRECT_URI') as string,
        }),
      },
    });

    // Permissions: API lambda can read/write table and put events
    props.table.grantReadWriteData(handler);
    props.eventBus.grantPutEventsTo(handler);

    // Store reference to handler for observability
    this.httpHandlerFunction = handler;

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
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['*'],
        allowCredentials: true,
        maxAge: Duration.seconds(86400), // 24 hours
      },
      deployOptions: {
        stageName: 'prod',
        accessLogDestination: new LogGroupLogDestination(accessLogGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
        tracingEnabled: true,
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

    // Store reference to API for observability
    this.restApi = api;

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
