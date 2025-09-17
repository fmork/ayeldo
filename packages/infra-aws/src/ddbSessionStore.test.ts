import type { SessionRecord } from '@ayeldo/types';
import { DdbSessionStore } from './ddbSessionStore';

describe('DdbSessionStore', () => {
  let store: DdbSessionStore;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      put: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
    };
    store = new DdbSessionStore({
      tableName: 'test-table',
      client: mockClient,
    });
  });

  describe('putSession', () => {
    it('should store session with proper keys and TTL', async () => {
      const session: SessionRecord = {
        sid: 'test-session-id',
        sub: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ttl: 1672531200,
        tokensEnc: {
          kid: 'v1',
          iv: 'test-iv',
          tag: 'test-tag',
          ciphertext: 'test-ciphertext',
        },
      };

      await store.putSession(session);

      expect(mockClient.put).toHaveBeenCalledWith({
        tableName: 'test-table',
        item: {
          PK: 'SESSION#test-session-id',
          SK: 'SESSION#test-session-id',
          ...session,
          ttl: 1672531200,
        },
      });
    });
  });

  describe('getSession', () => {
    it('should retrieve session by ID', async () => {
      const expectedSession: SessionRecord = {
        sid: 'test-session-id',
        sub: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        ttl: 1672531200,
        tokensEnc: {
          kid: 'v1',
          iv: 'test-iv',
          tag: 'test-tag',
          ciphertext: 'test-ciphertext',
        },
      };

      mockClient.get.mockResolvedValue({ item: expectedSession });

      const result = await store.getSession('test-session-id');

      expect(mockClient.get).toHaveBeenCalledWith({
        tableName: 'test-table',
        key: {
          PK: 'SESSION#test-session-id',
          SK: 'SESSION#test-session-id',
        },
      });
      expect(result).toEqual(expectedSession);
    });

    it('should return undefined when session not found', async () => {
      mockClient.get.mockResolvedValue({ item: undefined });

      const result = await store.getSession('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should set TTL to current time for immediate expiration', async () => {
      const now = Math.floor(Date.now() / 1000);
      jest.spyOn(Date, 'now').mockReturnValue(now * 1000);

      await store.deleteSession('test-session-id');

      expect(mockClient.update).toHaveBeenCalledWith({
        tableName: 'test-table',
        key: {
          PK: 'SESSION#test-session-id',
          SK: 'SESSION#test-session-id',
        },
        update: 'SET #ttl = :ttl',
        names: { '#ttl': 'ttl' },
        values: { ':ttl': now },
      });
    });
  });
});
