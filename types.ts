
export type Category = 'book' | 'summary' | 'questions';

export interface Material {
  id: string;
  title: string;
  type: Category;
  url: string;
  pageCount?: number;
  addedAt?: number;
}

export interface Subject {
  id: string;
  title: string;
  icon: string;
  color: string;
  materials: Material[];
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface AppConfig {
  requiredChannels: { id: string; name: string; url: string }[];
  adminIds: number[];
  isMaintenance: boolean;
}

export interface EngagementStats {
  pdfOpens: number;
  quizAttempts: number;
  aiMessages: number;
  popularSubjects: Record<string, number>;
  activeUsersLastHour: number;
}

export interface AdminStats {
  totalUsers: number;
  totalMaterials: number;
  activeToday: number;
  engagement: EngagementStats;
}

export interface Bookmark {
  materialId: string;
  materialTitle?: string;
  subjectId?: string;
  page: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface QuizState {
  isActive: boolean;
  score: number;
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  selectedSubject: string | null;
  loading: boolean;
  showResult: boolean;
}
