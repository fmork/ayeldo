import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['<rootDir>/packages/**/src/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/apps/web/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: 'tsconfig.base.json', useESM: true },
    ],
  },
};

export default config;

