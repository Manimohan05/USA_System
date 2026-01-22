import { Batch, BatchDto } from './batch';
import { Subject, SubjectDto } from './subject';

export interface Student {
  id: string; // UUID
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  address: string;
  nic: string;
  school: string;
  parentPhone: string;
  studentPhone?: string;
  admissionDate: string;
  isActive: boolean;
  batch: Batch;
  subjects: Subject[];
}

export interface StudentDto {
  id: string;
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  address: string;
  nic: string;
  school: string;
  parentPhone: string;
  studentPhone?: string;
  admissionDate: string;
  isActive: boolean;
  batch: BatchDto;
  subjects: SubjectDto[];
}

export interface CreateStudentRequest {
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  address: string;
  nic: string;
  school: string;
  parentPhone: string;
  studentPhone?: string;
  batchId: number;
  subjectIds: number[];
  admissionDate: string;
}

export interface UpdateStudentRequest {
  fullName: string;
  address: string;
  nic?: string;
  school: string;
  parentPhone: string;
  studentPhone?: string;
  batchId: number;
  subjectIds: number[];
  admissionDate: string;
  indexNumber: string;
}
