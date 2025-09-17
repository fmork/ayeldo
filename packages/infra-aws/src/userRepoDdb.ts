import type { IUserRepo } from '@ayeldo/core/src/ports/userRepo';
import type { UserCreateDto, UserDto } from '@ayeldo/types';
import { userCreateSchema, userSchema } from '@ayeldo/types';
import { makeUlid } from '@ayeldo/utils';
import type { DdbClient } from './ddbClient';

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
      id: id ?? makeUlid(),
      createdAt: new Date().toISOString(),
    };
    await this.client.put({
      tableName: this.tableName,
      item: {
        PK: `USER#${user.id}`,
        SK: `METADATA#${user.id}`,
        ...user,
      },
      // If ConditionExpression is needed, DdbClient should support it, otherwise remove or adapt as needed
    });
    return userSchema.parse(user);
  }

  public async getUserByOidcSub(sub: string): Promise<UserDto | undefined> {
    const result = await this.client.query({
      tableName: this.tableName,
      indexName: 'GSI1',
      keyCondition: 'oidcSub = :sub',
      values: { ':sub': sub },
    });
    const item = result.items?.[0];
    return item ? userSchema.parse(item) : undefined;
  }

  public async getUserByEmail(email: string): Promise<UserDto | undefined> {
    const result = await this.client.query({
      tableName: this.tableName,
      indexName: 'GSI2',
      keyCondition: 'email = :email',
      values: { ':email': email },
    });
    const item = result.items?.[0];
    return item ? userSchema.parse(item) : undefined;
  }

  public async updateUserSub(id: string, sub: string): Promise<void> {
    await this.client.update?.({
      tableName: this.tableName,
      key: { PK: `USER#${id}`, SK: `METADATA#${id}` },
      update: 'SET oidcSub = :sub',
      values: { ':sub': sub },
    });
  }
}

export default UserRepoDdb;
