export interface Subject {
  id: number;
  name: string;
  studentCount: number;
}

export interface SubjectDto {
  id: number;
  name: string;
  studentCount: number;
}

export interface CreateSubjectRequest {
  name: string;
}
