import { StudentDto } from './student';

export interface FeeRecordDto {
  id: string;
  student: StudentDto;
  amount: number;
  dueDate: string; // ISO date string
  paidAmount: number;
  paidDate?: string; // ISO date string
  isPaid: boolean;
  description?: string;
}

export interface CreateFeeRecordRequest {
  studentId: string;
  amount: number;
  dueDate: string; // ISO date string
  description?: string;
}

export interface UpdatePaymentRequest {
  paidAmount: number;
  paidDate: string; // ISO date string
}
