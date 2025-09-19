import { Config } from 'jest';

/** @type {import('ts-jest').JestConfigWithTsJest} */
// const { pathsToModuleNameMapper } = require('ts-jest');
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
const { compilerOptions } = require('./tsconfig.json');

const compilerOptionPathMappings: Record<string, string> = {}; //pathsToModuleNameMapper(compilerOptions.paths);
compilerOptionPathMappings['node-fetch'] = '<rootDir>/node_modules/node-fetch-jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['.'],
  testMatch: ['**/*.test.ts'],
  modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
  moduleNameMapper: compilerOptionPathMappings,
  collectCoverageFrom: ['src/**/*'],
};

export default config;
