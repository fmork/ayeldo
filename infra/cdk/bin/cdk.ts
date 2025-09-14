#!/usr/bin/env node
import 'source-map-support/register.js';
import { App } from 'aws-cdk-lib';
import { ApiStack } from '../src/api-stack';

const app = new App();

const account = process.env['CDK_DEFAULT_ACCOUNT'] as string | undefined;
const region = process.env['CDK_DEFAULT_REGION'] as string | undefined;

new ApiStack(app, 'AyeldoApiStack', account && region ? { env: { account, region } } : {});
