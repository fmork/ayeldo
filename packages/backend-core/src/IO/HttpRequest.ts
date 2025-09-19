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
