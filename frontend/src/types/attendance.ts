import { StudentDto } from './student';

export interface AttendanceMarkRequest {
  studentIdCode: string;
  batchId: number;
  subjectId: number;
}

export interface AttendanceMarkByIndexRequest {
  indexNumber: string;
  sessionId: number;
}

export interface AttendanceSessionCreateRequest {
  batchId: number;
  subjectId: number;
  sessionDate: string; // ISO date string (YYYY-MM-DD)
}

export interface AttendanceSessionDto {
  id: number;
  batchId: number;
  batchYear: string;
  subjectId: number;
  subjectName: string;
  sessionDate: string; // ISO date string
  isActive: boolean;
  createdAt: string; // ISO datetime string
}

export interface PresentStudentDto {
  id: string;
  studentIdCode: string;
  fullName: string;
  markedAt: string; // ISO date string
}

export interface AttendanceReportDto {
  date: string; // ISO date string
  presentStudents: PresentStudentDto[];
  absentStudents: StudentDto[];
}

export interface AttendanceValidationResponseDto {
  success: boolean;
  message: string;
  errorCode?: string; // For frontend to handle specific error types
  student?: StudentDto; // Student info if found
  markedAt?: string; // If already marked, when it was marked (ISO datetime)
}

export interface MarkedStudentDto {
  studentIdCode: string;
  indexNumber: string;
  fullName: string;
  markedAt: string; // ISO datetime string
}

export interface SessionAttendanceStatusDto {
  sessionId: number;
  sessionInfo: string; // e.g., "Batch 2024 - Mathematics - 2025-12-01"
  totalEnrolledStudents: number;
  presentCount: number;
  markedStudents: MarkedStudentDto[];
}
