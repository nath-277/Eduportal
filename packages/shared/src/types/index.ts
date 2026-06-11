export type UserRole = 'STUDENT' | 'LECTURER' | 'ADMIN';

export type Level = 'L100' | 'L200' | 'L300' | 'L400' | 'L500';

export type Semester = 'FIRST' | 'SECOND';

export type ResourceType =
  | 'LECTURE_NOTE'
  | 'PAST_QUESTION'
  | 'ASSIGNMENT'
  | 'TEXTBOOK'
  | 'OTHER';

export type NotificationCategory =
  | 'ANNOUNCEMENT'
  | 'RESULT'
  | 'RESOURCE'
  | 'FORUM'
  | 'SYSTEM';

export type ResultStatus = 'SUBMITTED' | 'APPROVED' | 'PUBLISHED';

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  fullname: string;
  email: string;
  matricNumber?: string;
  staffId?: string;
  role: UserRole;
  level?: Level;
  semester?: Semester;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  description?: string;
  departmentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAssignment {
  id: string;
  courseId: string;
  lecturerId: string;
  session: string;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  sessionId: string;
  semester: Semester;
  createdAt: string;
}

export interface Result {
  id: string;
  studentId: string;
  courseId: string;
  sessionId: string;
  semester: Semester;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  isPublished: boolean;
  status: ResultStatus;
  approvedById?: string;
  approvedAt?: string;
  publishedById?: string;
  publishedAt?: string;
  uploadedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  filePublicId?: string;
  fileType: string;
  fileSize?: number;
  type: ResourceType;
  courseId?: string;
  uploadedById: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceBookmark {
  id: string;
  resourceId: string;
  userId: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  isPinned: boolean;
  targetRole?: UserRole;
  scheduledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  tags: string[];
  likesCount: number;
  views: number;
  isPinned: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForumReply {
  id: string;
  body: string;
  authorId: string;
  postId: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
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
