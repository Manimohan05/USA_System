export interface Batch {
  id: number;
  batchYear: number;
}

export interface BatchDto {
  id: number;
  batchYear: number;
  studentCount: number;
}

export interface CreateBatchRequest {
  batchYear: number;
}
