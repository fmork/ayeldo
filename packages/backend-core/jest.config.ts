import type { Config } from 'jest';
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const tsConfigPath = path.resolve(__dirname, './tsconfig.json');
const tsConfigRaw = fs.existsSync(tsConfigPath) ? fs.readFileSync(tsConfigPath, 'utf8') : '{}';
const tsConfig = JSON.parse(tsConfigRaw) as { compilerOptions?: { baseUrl?: string } };
const compilerOptions = tsConfig.compilerOptions ?? {};

const compilerOptionPathMappings: Record<string, string> = {};
compilerOptionPathMappings['node-fetch'] = '<rootDir>/node_modules/node-fetch-jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['.'],
  testMatch: ['**/*.test.ts'],
  modulePaths: compilerOptions.baseUrl ? [compilerOptions.baseUrl] : [],
  moduleNameMapper: compilerOptionPathMappings,
  collectCoverageFrom: ['src/**/*'],
};

export default config;
