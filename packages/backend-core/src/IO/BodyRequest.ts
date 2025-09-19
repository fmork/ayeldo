import { HttpRequest } from './HttpRequest';

export interface BodyRequest<TBody> extends HttpRequest {
  body: TBody;
}
