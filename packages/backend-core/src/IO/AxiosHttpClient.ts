import axios, { Axios, AxiosRequestConfig } from 'axios';
import { ILogWriter } from '../logging/ILogWriter';
import { BodyRequest } from './BodyRequest';
import { HttpClient } from './HttpClient';
import { HttpRequest, HttpResponse } from './HttpRequest';

interface AxiosHttpClientProps {
  logWriter: ILogWriter;
}

export class AxiosHttpClient implements HttpClient {
  constructor(private readonly props: AxiosHttpClientProps) {}

  public async get(request: HttpRequest): Promise<HttpResponse> {
    this.props.logWriter.info(`[HttpClient] GET '${request.url}' - headers: ${JSON.stringify(request.headers)}`);
    const config: AxiosRequestConfig<void> = {
      ...this.getDefaultConfiguration(),
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    };

    if (request.headers !== null && request.headers !== undefined && config.headers !== undefined) {
      for (const key in request.headers) {
        this.props.logWriter.info(`${key} = ${request.headers[key]}`);
        config.headers[key] = request.headers[key];
      }
    }

    const axiosClient = new Axios(config);
    const response = await axiosClient.get(request.url);
    if (!response.status.toString().startsWith('2')) {
      this.props.logWriter.warn(`HTTP response ${response.status}: ${JSON.stringify(response.data)}`);
    }
    const responseData = JSON.stringify(response.data);
    this.props.logWriter.info(`[HttpClient] GET '${request.url}' - response: ${responseData}`);

    return {
      status: response.status,
      body: JSON.stringify(response.data),
      headers: response.headers,
    } as HttpResponse;
  }

  public async post<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse> {
    this.props.logWriter.info(`[HttpClient] POST '${request.url}'`);
    const config: AxiosRequestConfig<void> = this.getDefaultConfiguration();

    const axiosClient = new Axios(config);
    const response = await axiosClient.post(request.url, request.body);

    if (!response.status.toString().startsWith('2')) {
      this.props.logWriter.warn(`HTTP response ${response.status}: ${JSON.stringify(response.data)}`);
    }
    if (!response.status.toString().startsWith('2')) {
      this.props.logWriter.warn(`HTTP response ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return {
      status: response.status,
      body: JSON.stringify(response.data),
      headers: response.headers,
    } as HttpResponse;
  }

  public async put<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse> {
    this.props.logWriter.info(`[HttpClient] PUT '${request.url}'`);
    const config: AxiosRequestConfig<void> = this.getDefaultConfiguration();

    const axiosClient = new Axios(config);
    const response = await axiosClient.put(request.url, request.body);

    if (!response.status.toString().startsWith('2')) {
      this.props.logWriter.warn(`HTTP response ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return {
      status: response.status,
      body: JSON.stringify(response.data),
      headers: response.headers,
    } as HttpResponse;
  }

  public async delete<TBody>(request: BodyRequest<TBody>): Promise<HttpResponse> {
    this.props.logWriter.info(`[HttpClient] DELETE '${request.url}'`);
    const config: AxiosRequestConfig<void> = this.getDefaultConfiguration();

    const axiosClient = new Axios(config);
    const response = await axiosClient.delete(request.url, {
      data: request.body,
    });

    if (!response.status.toString().startsWith('2')) {
      this.props.logWriter.warn(`HTTP response ${response.status}: ${JSON.stringify(response.data)}`);
    }

    return {
      status: response.status,
      body: JSON.stringify(response.data),
      headers: response.headers,
    } as HttpResponse;
  }

  private getDefaultConfiguration = (): AxiosRequestConfig<void> => {
    return {
      transitional: axios.defaults.transitional,
      adapter: axios.defaults.adapter,
      transformRequest: axios.defaults.transformRequest,
      transformResponse: axios.defaults.transformResponse,
      xsrfCookieName: axios.defaults.xsrfCookieName,
      xsrfHeaderName: axios.defaults.xsrfHeaderName,
      validateStatus: axios.defaults.validateStatus,
    } as AxiosRequestConfig<void>;
  };
}
