import {
  Batch,
  BatchDetail,
  BatchEntryOptions,
  CurrentAccount,
  Page,
} from '../../../features/batch-consultation/domain/batch';
import { defineEndpoint } from '../defineEndpoint.class';
import { HttpMethod } from '../httpMethod.class';

export class BatchEndpoints {
  static readonly batches = {
    list: defineEndpoint<Page<Batch>>()(HttpMethod.GET, '/api/batches'),
    get: defineEndpoint<BatchDetail>()(HttpMethod.GET, '/api/batches/:id'),
    create: defineEndpoint<BatchDetail>()(HttpMethod.POST, '/api/batches'),
    update: defineEndpoint<BatchDetail>()(HttpMethod.PUT, '/api/batches/:id'),
    delete: defineEndpoint<void>()(HttpMethod.DELETE, '/api/batches/:id'),
    updateStatus: defineEndpoint<{ updated: number }>()(HttpMethod.PATCH, '/api/batches/status'),
  } as const;

  static readonly currentAccounts = {
    get: defineEndpoint<CurrentAccount>()(HttpMethod.GET, '/api/current-accounts/:number'),
  } as const;

  static readonly batchEntryOptions = {
    get: defineEndpoint<BatchEntryOptions>()(HttpMethod.GET, '/api/batch-entry-options'),
  } as const;
}
