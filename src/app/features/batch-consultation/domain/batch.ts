export type BatchStatus = 'OPEN' | 'SUBMITTED' | 'CONFIRMED';
export type BatchStatusFilter = BatchStatus | 'ALL';

export interface Batch {
  id: number;
  responsibleInstitution: string;
  institution: string;
  entryDate: string;
  amountCents: number;
  entryCount: number;
  createdBy: string;
  approvedBy: string | null;
  status: BatchStatus;
  statusChangedAt: string;
  justification: string | null;
}

export interface BatchFilters {
  responsibleInstitution: string;
  institution: string;
  status: BatchStatusFilter;
  idFrom: number | null;
  idTo: number | null;
  amountFromCents: number | null;
  amountToCents: number | null;
  entryDateFrom: string;
  entryDateTo: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
