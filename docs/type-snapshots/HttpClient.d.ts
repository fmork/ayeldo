import { Agent } from 'node:https';

export interface HttpRequest {
  url: string;
  headers?: Record<string, string>;
  contentType?: string;
  returnAsBuffer?: boolean;
  agent?: Agent;
  expectedHttpCodes?: number[];
}

export interface HttpResponse {
  status: number;
  body: string | ArrayBuffer;
  headers: Record<string, string>;
}

export interface BodyRequest<TBody> extends HttpRequest {
  body: TBody;
}

export abstract class HttpClient {
  abstract get(request: HttpRequest): Promise<HttpResponse>;
  abstract post<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
  abstract put<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
  abstract delete<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse>;
}
