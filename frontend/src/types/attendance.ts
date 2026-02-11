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
  batchDisplayName: string;
  subjectId: number;
  subjectName: string;
  sessionDate: string; // ISO date string
  isActive: boolean;
  createdAt: string; // ISO datetime string
  endedAt?: string; // ISO datetime string when session was ended
  canReactivate?: boolean; // True if session is within 10-minute reactivation window
  isClosed?: boolean; // True if session is temporarily closed
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

export interface AttendanceReportRequest {
  // Single date (for existing functionality - backward compatibility)
  date?: string; // ISO date string (YYYY-MM-DD)
  
  // Date range filtering (new functionality)
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string (YYYY-MM-DD)
  
  // Batch and subject filtering (existing functionality)
  batchId?: number;
  subjectId?: number;
  
  // Student-specific filtering (new functionality)
  studentId?: string; // UUID
  studentIdCode?: string; // Alternative to studentId for convenience
}

export interface AttendanceRecordDto {
  studentId: string;
  studentIdCode: string;
  studentName: string;
  subjectName: string;
  sessionDate: string; // ISO date string
  markedAt?: string; // ISO datetime string, null for absent records
  status: 'Present' | 'Absent';
}

export interface EnhancedAttendanceReportDto {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  studentName?: string; // Present if this is a student-specific report
  studentIdCode?: string; // Present if this is a student-specific report
  batchName: string; // Name/year of the batch
  subjectName: string; // Name of the subject
  attendanceRecords: AttendanceRecordDto[]; // All attendance records in the date range
  totalPresentDays: number; // Number of days student was present (for student-specific reports)
  totalClassDays: number; // Total number of class days in the period
  attendancePercentage: number; // Attendance percentage (for student-specific reports)
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
  hasFeePaymentIssue: boolean; // True if student hasn't paid fees by attendance date
}

export interface SessionAttendanceStatusDto {
  sessionId: number;
  sessionInfo: string; // e.g., "Batch 2024 - Mathematics - 2025-12-01"
  totalEnrolledStudents: number;
  presentCount: number;
  markedStudents: MarkedStudentDto[];
}
