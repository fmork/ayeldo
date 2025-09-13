import type { Config } from 'jest';
import * as path from 'node:path';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['<rootDir>/packages/**/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/apps/web/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@ayeldo/types$': '<rootDir>/packages/types/src/index.ts',
    '^@ayeldo/core$': '<rootDir>/packages/core/src/index.ts',
    '^@ayeldo/utils$': '<rootDir>/packages/utils/src/index.ts',
    '^@ayeldo/infra-aws$': '<rootDir>/packages/infra-aws/src/index.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: path.join(__dirname, 'tsconfig.base.json'), useESM: true },
    ],
  },
};

export default config;
