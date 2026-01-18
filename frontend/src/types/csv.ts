export interface CsvImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  errors: string[];
  importedStudents: any[]; // Will use StudentDto type
}

export interface CsvUploadProgress {
  uploading: boolean;
  progress: number;
  completed: boolean;
  error?: string;
}