import {
  HttpClient as AngularHttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { HasPathParams, IEndpoint, PathParamNames } from './IEndpoint/IEndpoint';

type QueryValue = string | number | boolean | null | undefined;

interface BaseRequestOptions {
  queryParams?: Record<string, QueryValue>;
  body?: unknown;
}

type PathParamsOption<TPath extends string> = HasPathParams<TPath> extends true
  ? { pathParams: Record<PathParamNames<TPath>, string | number> }
  : { pathParams?: undefined };

type RequestOptions<TPath extends string> = BaseRequestOptions & PathParamsOption<TPath>;

type RequestArgs<TPath extends string> = HasPathParams<TPath> extends true
  ? [options: RequestOptions<TPath>]
  : [options?: RequestOptions<TPath>];

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }

  static from(error: HttpErrorResponse): ApiError {
    const serverMessage = (error.error as { message?: unknown } | null)?.message;
    if (typeof serverMessage === 'string') return new ApiError(error.status, serverMessage);
    if (error.status === 0 || error.status >= 500) {
      return new ApiError(error.status, 'Não foi possível conectar à API. Verifique se o servidor mock está em execução.');
    }
    return new ApiError(error.status, `Erro ${error.status} ao chamar a API.`);
  }
}

@Injectable({ providedIn: 'root' })
export class HttpClient {
  private readonly http = inject(AngularHttpClient);

  request<TPath extends string, TResponse>(
    endpoint: IEndpoint<TPath, TResponse>,
    ...[options]: RequestArgs<TPath>
  ): Observable<TResponse> {
    const requestOptions = (options ?? {}) as BaseRequestOptions & { pathParams?: Record<string, string | number> };

    return this.http
      .request<TResponse>(endpoint.method, montarUrl(endpoint.path, requestOptions.pathParams), {
        body: requestOptions.body,
        params: montarQuery(requestOptions.queryParams),
      })
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => ApiError.from(error))));
  }
}

export function montarUrl(path: string, pathParams: Record<string, string | number> = {}): string {
  return path.replace(/:(\w+)/g, (_match, name: string) => {
    const value = pathParams[name];
    if (value === undefined || value === '') throw new Error(`Path param "${name}" ausente em ${path}`);
    return encodeURIComponent(String(value));
  });
}

export function montarQuery(queryParams: Record<string, QueryValue> = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
