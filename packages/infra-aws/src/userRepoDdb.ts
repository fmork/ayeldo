import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { UserCreateDto, UserDto } from '@ayeldo/types';
import { userCreateSchema, userSchema } from '@ayeldo/types';
import { makeUuid } from '@ayeldo/utils';
import type { DdbClient } from './ddbClient';
import {
  GSI2_NAME,
  gsi2UserByEmail,
  gsi2UserByOidcSub,
  pkUser,
  skUserLookup,
  skUserMetadata,
  userLookupPartition,
} from './keys';

type UserLookupScope = 'OIDC_SUB' | 'EMAIL';

interface UserItem extends Record<string, unknown> {
  readonly PK: string;
  readonly SK: string;
  readonly type: 'User';
}

interface UserLookupItem extends Record<string, unknown> {
  readonly PK: string;
  readonly SK: string;
  readonly type: 'UserLookup';
  readonly lookupScope: UserLookupScope;
  readonly lookupValue: string;
  readonly userId: string;
  readonly GSI2PK: string;
  readonly GSI2SK: string;
}

interface UserRepoDdbProps {
  tableName: string;
  client: DdbClient;
}

export class UserRepoDdb implements IUserRepo {
  private readonly tableName: string;
  private readonly client: DdbClient;

  public constructor(props: UserRepoDdbProps) {
    this.tableName = props.tableName;
    this.client = props.client;
  }

  public async createUser(input: UserCreateDto, id?: string): Promise<UserDto> {
    const parsed = userCreateSchema.parse(input);
    const user: UserDto = {
      ...parsed,
      id: id ?? makeUuid(),
      createdAt: new Date().toISOString(),
    };

    const userPk = pkUser(user.id);
    const userItem: UserItem = {
      PK: userPk,
      SK: skUserMetadata(user.id),
      type: 'User',
      ...user,
    };

    const oidcLookup: UserLookupItem = {
      PK: userPk,
      SK: skUserLookup('OIDC_SUB'),
      type: 'UserLookup',
      lookupScope: 'OIDC_SUB',
      lookupValue: user.oidcSub,
      userId: user.id,
      ...gsi2UserByOidcSub(user.oidcSub, user.id),
    };

    const emailLookup: UserLookupItem = {
      PK: userPk,
      SK: skUserLookup('EMAIL'),
      type: 'UserLookup',
      lookupScope: 'EMAIL',
      lookupValue: user.email,
      userId: user.id,
      ...gsi2UserByEmail(user.email, user.id),
    };

    await this.client.put({ tableName: this.tableName, item: userItem });
    await this.client.put({ tableName: this.tableName, item: oidcLookup });
    await this.client.put({ tableName: this.tableName, item: emailLookup });

    return userSchema.parse(user);
  }

  public async getUserByOidcSub(sub: string): Promise<UserDto | undefined> {
    const result = await this.client.query<UserLookupItem>({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gsi2pk = :gsi2pk',
      names: { '#gsi2pk': 'GSI2PK' },
      values: { ':gsi2pk': userLookupPartition('OIDC_SUB', sub) },
      limit: 1,
    });
    const lookupItem = result.items[0];
    return lookupItem ? this.getUserById(lookupItem.userId) : undefined;
  }

  public async getUserByEmail(email: string): Promise<UserDto | undefined> {
    const result = await this.client.query<UserLookupItem>({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gsi2pk = :gsi2pk',
      names: { '#gsi2pk': 'GSI2PK' },
      values: { ':gsi2pk': userLookupPartition('EMAIL', email) },
      limit: 1,
    });
    const lookupItem = result.items[0];
    return lookupItem ? this.getUserById(lookupItem.userId) : undefined;
  }

  public async updateUserSub(id: string, sub: string): Promise<void> {
    const existing = await this.getUserById(id);
    if (!existing) {
      return;
    }

    const updated: UserDto = {
      ...existing,
      oidcSub: sub,
    };

    const userPk = pkUser(id);

    await this.client.put({
      tableName: this.tableName,
      item: {
        PK: userPk,
        SK: skUserMetadata(id),
        type: 'User',
        ...updated,
      },
    });

    const lookupItem: UserLookupItem = {
      PK: userPk,
      SK: skUserLookup('OIDC_SUB'),
      type: 'UserLookup',
      lookupScope: 'OIDC_SUB',
      lookupValue: sub,
      userId: id,
      ...gsi2UserByOidcSub(sub, id),
    };

    await this.client.put({ tableName: this.tableName, item: lookupItem });
  }

  private async getUserById(id: string): Promise<UserDto | undefined> {
    const { item } = await this.client.get<UserItem>({
      tableName: this.tableName,
      key: { PK: pkUser(id), SK: skUserMetadata(id) },
    });
    if (!item) {
      return undefined;
    }
    return userSchema.parse(item);
  }
}

export default UserRepoDdb;
