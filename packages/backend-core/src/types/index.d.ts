import { UserJwtPayload } from './UserJwtPayload';
declare namespace Express {
  export interface Request {
    user?: UserJwtPayload;
  }
}
