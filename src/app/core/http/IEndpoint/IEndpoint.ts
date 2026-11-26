import { HttpMethod } from '../httpMethod.class';

export interface IEndpoint<TPath extends string = string, TResponse = unknown> {
  readonly method: HttpMethod;
  readonly path: TPath;
  readonly __response?: TResponse;
}

export type PathParamNames<TPath extends string> = TPath extends `${string}:${infer Param}/${infer Rest}`
  ? Param | PathParamNames<Rest>
  : TPath extends `${string}:${infer Param}`
    ? Param
    : never;

export type HasPathParams<TPath extends string> = [PathParamNames<TPath>] extends [never] ? false : true;
