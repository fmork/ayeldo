import type { Uuid, UserCreateDto, UserDto } from '@ayeldo/types';

export interface IUserRepo {
  createUser(input: UserCreateDto, id?: Uuid): Promise<UserDto>;
  getUserByOidcSub(sub: string): Promise<UserDto | undefined>;
  getUserByEmail(email: string): Promise<UserDto | undefined>;
  updateUserSub(id: string, sub: string): Promise<void>;
}
