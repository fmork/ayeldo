import { BodyRequest } from './BodyRequest';
import { HttpRequest, HttpResponse } from './HttpRequest';

export abstract class HttpClient {
  abstract get(request: HttpRequest): Promise<HttpResponse>;
  abstract post<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
  abstract put<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
  abstract delete<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
}
