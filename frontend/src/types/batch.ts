export interface Batch {
  id: number;
  batchYear: number;
  isDayBatch: boolean;
}

export interface BatchDto {
  id: number;
  batchYear: number;
  isDayBatch: boolean;
  displayName: string;
  studentCount: number;
  isArchived: boolean;
}

export interface CreateBatchRequest {
  batchYear: number;
  isDayBatch: boolean;
}
