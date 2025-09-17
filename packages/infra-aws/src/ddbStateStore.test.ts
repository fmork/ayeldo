import type { StateRecord } from '@ayeldo/types';
import { DdbStateStore } from './ddbStateStore';

describe('DdbStateStore', () => {
  let store: DdbStateStore;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      put: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    };
    store = new DdbStateStore({
      tableName: 'test-table',
      client: mockClient,
    });
  });

  describe('putState', () => {
    it('should store state with proper keys and TTL', async () => {
      const state: StateRecord = {
        state: 'test-state-value',
        nonce: 'test-nonce',
        codeVerifier: 'test-code-verifier',
        createdAt: '2024-01-01T00:00:00Z',
        ttl: 1672531200,
      };

      await store.putState(state);

      expect(mockClient.put).toHaveBeenCalledWith({
        tableName: 'test-table',
        item: {
          PK: 'STATE#test-state-value',
          SK: 'STATE#test-state-value',
          ...state,
          ttl: 1672531200,
        },
      });
    });
  });

  describe('getState', () => {
    it('should retrieve state by value', async () => {
      const expectedState: StateRecord = {
        state: 'test-state-value',
        nonce: 'test-nonce',
        codeVerifier: 'test-code-verifier',
        createdAt: '2024-01-01T00:00:00Z',
        ttl: 1672531200,
      };

      mockClient.get.mockResolvedValue({ item: expectedState });

      const result = await store.getState('test-state-value');

      expect(mockClient.get).toHaveBeenCalledWith({
        tableName: 'test-table',
        key: {
          PK: 'STATE#test-state-value',
          SK: 'STATE#test-state-value',
        },
      });
      expect(result).toEqual(expectedState);
    });

    it('should return undefined when state not found', async () => {
      mockClient.get.mockResolvedValue({ item: undefined });

      const result = await store.getState('non-existent-state');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteState', () => {
    it('should set TTL to current time for immediate expiration', async () => {
      const now = Math.floor(Date.now() / 1000);
      jest.spyOn(Date, 'now').mockReturnValue(now * 1000);

      await store.deleteState('test-state-value');

      expect(mockClient.update).toHaveBeenCalledWith({
        tableName: 'test-table',
        key: {
          PK: 'STATE#test-state-value',
          SK: 'STATE#test-state-value',
        },
        update: 'SET #ttl = :ttl',
        names: { '#ttl': 'ttl' },
        values: { ':ttl': now },
      });
    });
  });
});
