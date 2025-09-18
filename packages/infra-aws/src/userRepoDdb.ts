import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { UserCreateDto, UserDto } from '@ayeldo/types';
import { userCreateSchema, userSchema } from '@ayeldo/types';
import { makeUuid } from '@ayeldo/utils';
import type { DdbClient } from './ddbClient';
import { GSI2_NAME, GSI3_NAME, gsi2UserByOidcSub, gsi3UserByEmail } from './keys';

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

    // Create GSI keys for user lookups
    const gsi2 = gsi2UserByOidcSub(user.oidcSub, user.id);
    const gsi3 = gsi3UserByEmail(user.email, user.id);

    await this.client.put({
      tableName: this.tableName,
      item: {
        PK: `USER#${user.id}`,
        SK: `METADATA#${user.id}`,
        ...user,
        ...gsi2,
        ...gsi3,
      },
      // If ConditionExpression is needed, DdbClient should support it, otherwise remove or adapt as needed
    });
    return userSchema.parse(user);
  }

  public async getUserByOidcSub(sub: string): Promise<UserDto | undefined> {
    const result = await this.client.query({
      tableName: this.tableName,
      indexName: GSI2_NAME,
      keyCondition: '#gsi2pk = :gsi2pk',
      names: { '#gsi2pk': 'GSI2PK' },
      values: { ':gsi2pk': `OIDC_SUB#${sub}` },
    });
    const item = result.items?.[0];
    return item ? userSchema.parse(item) : undefined;
  }

  public async getUserByEmail(email: string): Promise<UserDto | undefined> {
    const result = await this.client.query({
      tableName: this.tableName,
      indexName: GSI3_NAME,
      keyCondition: '#gsi3pk = :gsi3pk',
      names: { '#gsi3pk': 'GSI3PK' },
      values: { ':gsi3pk': `EMAIL#${email}` },
    });
    const item = result.items?.[0];
    return item ? userSchema.parse(item) : undefined;
  }

  public async updateUserSub(id: string, sub: string): Promise<void> {
    const gsi2 = gsi2UserByOidcSub(sub, id);
    await this.client.update?.({
      tableName: this.tableName,
      key: { PK: `USER#${id}`, SK: `METADATA#${id}` },
      update: 'SET oidcSub = :sub, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk',
      values: {
        ':sub': sub,
        ':gsi2pk': gsi2.GSI2PK,
        ':gsi2sk': gsi2.GSI2SK,
      },
    });
  }
}

export default UserRepoDdb;
