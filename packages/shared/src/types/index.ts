export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

export type Level = '100' | '200' | '300' | '400' | '500';

export type Semester = 'FIRST' | 'SECOND';

export interface User {
  id: string;
  fullname: string;
  email: string;
  matricNumber?: string;
  role: UserRole;
  level?: Level;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  lecturerId?: string;
  departmentId: string;
}

export interface Result {
  id: string;
  studentId: string;
  courseId: string;
  score: number;
  grade: string;
  gradePoint: number;
  semester: Semester;
  session: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  courseId?: string;
  uploadedById: string;
  downloadCount: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  isPinned: boolean;
  scheduledAt?: string;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  tags: string[];
  likesCount: number;
  repliesCount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
