#!/usr/bin/env node
import 'source-map-support/register.js';
import { App } from 'aws-cdk-lib';
import { ApiStack } from '../src/api-stack';
import { CoreStack } from '../src/core-stack';

const app = new App();

const account = process.env['CDK_DEFAULT_ACCOUNT'] as string | undefined;
const region = process.env['CDK_DEFAULT_REGION'] as string | undefined;

const env = account && region ? { env: { account, region } } : {};

// Core infra: DynamoDB (with GSIs), etc.
new CoreStack(app, 'AyeldoCoreStack', env);

// API stack (lambda + http api)
new ApiStack(app, 'AyeldoApiStack', env);
