import { describe } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { AxiosHttpClient, HttpClient } from 'src/IO';
import { TokenKeyCache } from 'src/security';
import { runTest } from 'test/TestDependencies';
import { TestLogWriter } from 'test/TestLogWriter';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { HttpResponse } from '../../src/IO/HttpRequest';
import { JwksResponse } from '../../src/models/security/JwksResponse';
import { WellKnownOpenIdConfiguration } from '../../src/models/security/WellKnownOpenIdConfiguration';

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

  const wellKnownOidcConfigurationString = readFileSync('./test/testdata/well-known-openid-configuration.json').toString();
  when(httpClientMock.get(anything())).thenCall((request: any) => {
    if (request.url === 'https://auth-host/.well-known/openid-configuration') {
      const result = JSON.parse(wellKnownOidcConfigurationString) as WellKnownOpenIdConfiguration;
      console.info(`Returning wellKnownOidcConfigurationString: ${JSON.stringify(result)}`);
      return Promise.resolve({ body: JSON.stringify(result) } as HttpResponse);
    }

    if (request.url === 'https://auth-host/.well-known/jwks.json') {
      const result = JSON.parse(jwksJsonString) as JwksResponse;
      console.info(`Returning jwksJsonString: ${JSON.stringify(result)}`);

      return Promise.resolve({
        body: JSON.stringify(result),
      } as HttpResponse);
    }

    throw new Error(`Unexpected URL: ${request.url}`);
  });

  const jwksJsonString = readFileSync('./test/testdata/jwks.json').toString();

  return httpClientMock;
};
