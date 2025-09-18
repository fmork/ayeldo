#!/usr/bin/env node
import { App, Tags } from 'aws-cdk-lib';
import 'source-map-support/register.js';
import { AnalyticsStack } from '../src/analytics-stack';
import { ApiStack } from '../src/api-stack';
import { CertStack } from '../src/cert-stack';
import { CoreStack } from '../src/core-stack';
import { computeDomainConfig } from '../src/domain';
import { EventsStack } from '../src/events-stack';
import { ObservabilityStack } from '../src/observability-stack';

const app = new App();

function deriveEnvName(): string {
  const ctx = (app.node.tryGetContext('envName') as string | undefined) ?? process.env['ENV_NAME'];
  let branch =
    ctx ??
    process.env['GIT_BRANCH'] ??
    process.env['BRANCH_NAME'] ??
    process.env['CI_COMMIT_REF_NAME'] ??
    'dev';
  if (branch.includes('/')) branch = branch.split('/').pop() ?? branch;
  if (branch === 'main' || branch === 'master') return 'prod';
  return branch;
}

const envName = deriveEnvName();
const domainConfig = computeDomainConfig(envName, process.env['FMORK_SITE_DOMAIN_NAME']);

const account = process.env['CDK_DEFAULT_ACCOUNT'] as string | undefined;
const region = process.env['CDK_DEFAULT_REGION'] as string | undefined;

const env = account && region ? { env: { account, region } } : {};

let certStack: CertStack | undefined;
if (domainConfig && account) {
  certStack = new CertStack(app, `AyeldoCertStack-${envName}`, {
    env: { account, region: 'us-east-1' },
    domainConfig,
    crossRegionReferences: true,
  });
  Tags.of(certStack).add('Environment', envName);
  Tags.of(certStack).add('Service', 'ayeldo');
}

const core = new CoreStack(app, `AyeldoCoreStack-${envName}`, {
  ...(env as { env?: { account?: string; region?: string } }),
  ...(domainConfig ? { domainConfig } : {}),
  ...(certStack ? { certificateArn: certStack.certificateArn } : {}),
  crossRegionReferences: true,
});
Tags.of(core).add('Environment', envName);
Tags.of(core).add('Service', 'ayeldo');
if (certStack) core.addDependency(certStack);

const events = new EventsStack(app, `AyeldoEventsStack-${envName}`, env);
Tags.of(events).add('Environment', envName);
Tags.of(events).add('Service', 'ayeldo');

const api = new ApiStack(app, `AyeldoApiStack-${envName}`, {
  ...(env as { env?: { account?: string; region?: string } }),
  table: core.table,
  eventBus: events.bus,
  mediaBucket: core.mediaBucket,
  ...(domainConfig ? { domainConfig } : {}),
});
Tags.of(api).add('Environment', envName);
Tags.of(api).add('Service', 'ayeldo');

const analytics = new AnalyticsStack(app, `AyeldoAnalyticsStack-${envName}`, {
  ...(env as { env?: { account?: string; region?: string } }),
  table: core.table,
  eventBus: events.bus,
});
Tags.of(analytics).add('Environment', envName);
Tags.of(analytics).add('Service', 'ayeldo');

const observability = new ObservabilityStack(app, `AyeldoObservabilityStack-${envName}`, {
  ...(env as { env?: { account?: string; region?: string } }),
  apiGatewayId: api.restApi.restApiId,
  lambdaFunctions: [api.httpHandlerFunction, analytics.analyticsFunction],
  dlQueues: events.dlQueues,
});
Tags.of(observability).add('Environment', envName);
Tags.of(observability).add('Service', 'ayeldo');
