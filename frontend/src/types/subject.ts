export interface Subject {
  id: number;
  name: string;
  studentCount: number;
  isArchived: boolean;
}

export interface SubjectDto {
  id: number;
  name: string;
  studentCount: number;
  isArchived: boolean;
}

export interface CreateSubjectRequest {
  name: string;
}
