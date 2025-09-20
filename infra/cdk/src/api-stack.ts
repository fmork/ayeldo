import type { StackProps } from 'aws-cdk-lib';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  AccessLogFormat,
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
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import path from 'path';
import type { DomainConfig } from './domain';

export interface ApiStackProps extends StackProps {
  readonly table: Table;
  readonly eventBus: EventBus;
  readonly mediaBucket: Bucket;
  readonly domainConfig?: DomainConfig;
  readonly cdnHost?: string;
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

    // Compute default origins
    const computedApiHost = props.domainConfig ? props.domainConfig.apiHost : 'localhost:3000';
    const computedWebHost = props.domainConfig ? props.domainConfig.webHost : 'localhost:3001';
    const apiOrigin = `https://${computedApiHost}`;
    const webOrigin = `https://${computedWebHost}`;

    const lambdaEnv = buildRuntimeEnvironment({ apiOrigin, webOrigin });

    // Ensure required SiteConfiguration infrastructure env vars are present. Prefer
    // explicit environment overrides, otherwise fallback to CDK-provided resources.
    const stackRegion = Stack.of(this).region;

    if (!lambdaEnv['MEDIA_BUCKET']) {
      lambdaEnv['MEDIA_BUCKET'] = readOptionalEnv('MEDIA_BUCKET') ?? props.mediaBucket.bucketName;
    }

    if (!lambdaEnv['CDN_HOST']) {
      const envCdnHost = readOptionalEnv('CDN_HOST') ?? readOptionalEnv('FMORK_SITE_CDN_HOST');
      lambdaEnv['CDN_HOST'] = envCdnHost ?? props.cdnHost ?? props.domainConfig?.cdnHost ?? 'localhost:3002';
    }

    if (!lambdaEnv['IMAGE_VARIANTS']) {
      const envVariants = readOptionalEnv('IMAGE_VARIANTS');
      lambdaEnv['IMAGE_VARIANTS'] =
        envVariants ??
        JSON.stringify([
          { label: 'xl', longEdge: 1900 },
          { label: 'lg', longEdge: 1200 },
          { label: 'md', longEdge: 800 },
        ]);
    }

    if (!lambdaEnv['DDB_ENDPOINT']) {
      const envDdbEndpoint = readOptionalEnv('DDB_ENDPOINT');
      lambdaEnv['DDB_ENDPOINT'] = envDdbEndpoint ?? `https://dynamodb.${stackRegion}.amazonaws.com`;
    }

    if (!lambdaEnv['PORT']) {
      lambdaEnv['PORT'] = readOptionalEnv('PORT') ?? '3000';
    }

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
        UPLOAD_BUCKET: props.mediaBucket.bucketName,
        ...lambdaEnv,
      },
    });

    // Permissions: API lambda can read/write table and put events
    props.table.grantReadWriteData(handler);
    props.eventBus.grantPutEventsTo(handler);
    props.mediaBucket.grantReadWrite(handler);

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

function buildRuntimeEnvironment(origins: { apiOrigin: string; webOrigin: string }): Record<string, string> {
  const readEnv = (...keys: readonly string[]): string | undefined => {
    for (const key of keys) {
      const value = readOptionalEnv(key);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  };

  const stripTrailingSlash = (value: string): string => value.replace(/\/$/, '');
  const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

  const rawApiBase = readEnv('API_BASE_URL', 'BFF_ORIGIN') ?? origins.apiOrigin;
  const normalizedApiBase = stripTrailingSlash(rawApiBase);
  const apiBasePath = readEnv('API_BASE_PATH') ?? '/api';
  const normalizedApiBasePath = ensureLeadingSlash(apiBasePath);

  const rawWebOrigin = readEnv('WEB_ORIGIN') ?? origins.webOrigin;
  const normalizedWebOrigin = stripTrailingSlash(rawWebOrigin);

  const runtimeEnv: Record<string, string> = {
    API_BASE_URL: `${normalizedApiBase}${normalizedApiBasePath}`,
    WEB_ORIGIN: normalizedWebOrigin,
  };

  const sessionEncKey = readEnv('SESSION_ENC_KEY', 'FMORK_SITE_SESSION_ENC_KEY');
  if (sessionEncKey) {
    runtimeEnv['SESSION_ENC_KEY'] = sessionEncKey;
  }

  const apiJwtSecret = readEnv('API_JWT_SECRET', 'FMORK_SITE_API_JWT_SECRET');
  if (apiJwtSecret) {
    runtimeEnv['API_JWT_SECRET'] = apiJwtSecret;
  }

  const oidcIssuer = readEnv('OIDC_ISSUER_URL', 'FMORK_SITE_OIDC_AUTHORITY');
  const oidcClientId = readEnv('OIDC_CLIENT_ID', 'FMORK_SITE_OIDC_CLIENT_ID');
  const oidcClientSecret = readEnv('OIDC_CLIENT_SECRET', 'FMORK_SITE_OIDC_CLIENT_SECRET');

  if (oidcIssuer && oidcClientId && oidcClientSecret) {
    const cleanAuthority = stripTrailingSlash(oidcIssuer);
    runtimeEnv['OIDC_ISSUER_URL'] = cleanAuthority;
    runtimeEnv['OIDC_CLIENT_ID'] = oidcClientId;
    runtimeEnv['OIDC_CLIENT_SECRET'] = oidcClientSecret;
    runtimeEnv['OIDC_SCOPES'] = readEnv('OIDC_SCOPES') ?? 'openid email profile';

    const authUrl = readEnv('OIDC_AUTH_URL', 'FMORK_SITE_OIDC_AUTH_URL') ?? `${cleanAuthority}/oauth2/authorize`;
    const tokenUrl = readEnv('OIDC_TOKEN_URL', 'FMORK_SITE_OIDC_TOKEN_URL') ?? `${cleanAuthority}/oauth2/token`;
    const jwksUrl = readEnv('OIDC_JWKS_URL', 'FMORK_SITE_OIDC_JWKS_URL') ?? `${cleanAuthority}/.well-known/jwks.json`;
    runtimeEnv['OIDC_AUTH_URL'] = authUrl;
    runtimeEnv['OIDC_TOKEN_URL'] = tokenUrl;
    runtimeEnv['OIDC_JWKS_URL'] = jwksUrl;

    const redirectSetting = readEnv('OIDC_REDIRECT_URI', 'FMORK_SITE_OIDC_REDIRECT_URI') ?? '/auth/callback';
    const redirectUri = redirectSetting.startsWith('http://') || redirectSetting.startsWith('https://')
      ? redirectSetting
      : `${normalizedApiBase}${ensureLeadingSlash(redirectSetting)}`;
    runtimeEnv['OIDC_REDIRECT_URI'] = redirectUri;
  }

  return runtimeEnv;
}

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
