import { describe } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import type { HttpClient } from '../IO';
import { AxiosHttpClient } from '../IO';
import type { HttpResponse } from '../IO/HttpRequest';
import type { JwksResponse } from '../models/security/JwksResponse';
import type { WellKnownOpenIdConfiguration } from '../models/security/WellKnownOpenIdConfiguration';
import { TokenKeyCache } from '../security';
import { runTest } from '../test/TestDependencies';
import { TestLogWriter } from '../test/TestLogWriter';

const logWriter = new TestLogWriter();

describe('TokenKeyCache', () => {
  runTest('Downloads keys when needed', async () => {
    const mockHttpClient = getHttpClientMock();
    const tkc = new TokenKeyCache({
      httpClient: instance(mockHttpClient),
      logWriter: logWriter,
    });

    await tkc.getKey('https://auth-host', 'E18q2mw3d9KQ7hQUmN0BW2bJoKIJDUS+ijgN9NlL7Og=');

    verify(mockHttpClient.get(anything())).twice();
  });

  runTest('Downloads keys only once', async () => {
    const mockHttpClient = getHttpClientMock();
    const tkc = new TokenKeyCache({
      httpClient: instance(mockHttpClient),
      logWriter: logWriter,
    });

    // First call, should trigger download
    await tkc.getKey('https://auth-host', 'E18q2mw3d9KQ7hQUmN0BW2bJoKIJDUS+ijgN9NlL7Og=');
    // Second call, should NOT trigger download
    await tkc.getKey('https://auth-host', 'E18q2mw3d9KQ7hQUmN0BW2bJoKIJDUS+ijgN9NlL7Og=');

    verify(mockHttpClient.get(anything())).twice();
  });
});

const getHttpClientMock = (): HttpClient => {
  const httpClientMock = mock(AxiosHttpClient);

  const wellKnownOidcConfigurationString = readFileSync(
    resolve(__dirname, '../../test/testdata/well-known-openid-configuration.json'),
  ).toString();
  when(httpClientMock.get(anything())).thenCall((request: any) => {
    if (request.url === 'https://auth-host/.well-known/openid-configuration') {
      const result = JSON.parse(wellKnownOidcConfigurationString) as WellKnownOpenIdConfiguration;
      return Promise.resolve({ body: JSON.stringify(result) } as HttpResponse);
    }

    if (request.url === 'https://auth-host/.well-known/jwks.json') {
      const jwksJsonString = readFileSync(
        resolve(__dirname, '../../test/testdata/jwks.json'),
      ).toString();
      const result = JSON.parse(jwksJsonString) as JwksResponse;

      return Promise.resolve({
        body: JSON.stringify(result),
      } as HttpResponse);
    }

    throw new Error(`Unexpected URL: ${request.url}`);
  });

  return httpClientMock;
};
