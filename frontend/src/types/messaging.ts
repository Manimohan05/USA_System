export interface BroadcastMessageRequest {
  message: string;
  batchId?: number;
  subjectId?: number;
}

export interface MessageResponse {
  message: string;
}

export interface MessagingStatsDto {
  totalStudents: number;
  parentContacts: number;
}

export interface TargetedStudentCountDto {
  studentCount: number;
  parentContactCount: number;
}
