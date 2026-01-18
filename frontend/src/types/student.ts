import { Batch, BatchDto } from './batch';
import { Subject, SubjectDto } from './subject';

export interface Student {
  id: string; // UUID
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  parentPhone: string;
  studentPhone?: string;
  isActive: boolean;
  batch: Batch;
  subjects: Subject[];
}

export interface StudentDto {
  id: string;
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  parentPhone: string;
  studentPhone?: string;
  isActive: boolean;
  batch: BatchDto;
  subjects: SubjectDto[];
}

export interface CreateStudentRequest {
  studentIdCode: string;
  fullName: string;
  parentPhone: string;
  studentPhone?: string;
  batchId: number;
  subjectIds: number[];
}

export interface UpdateStudentRequest {
  fullName: string;
  parentPhone: string;
  studentPhone?: string;
  batchId: number;
  subjectIds: number[];
}
