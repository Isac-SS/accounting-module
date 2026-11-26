import { IEndpoint } from './IEndpoint/IEndpoint';
import { HttpMethod } from './httpMethod.class';

export function defineEndpoint<TResponse = void>() {
  return <TPath extends string>(method: HttpMethod, path: TPath): IEndpoint<TPath, TResponse> => ({
    method,
    path,
  });
}
