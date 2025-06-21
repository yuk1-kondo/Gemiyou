// 共通型定義

export interface Task {
  id: string;
  content: string;
  difficulty: string;
  aiPersonality?: {
    name: string;
    type: string;
  };
  userResponse?: string;
  evaluation?: {
    score: number;
    feedback: string;
    encouragement?: string | undefined;
    attitude?: number | undefined;
    content?: number | undefined;
    creativity?: number | undefined;
  };
  createdAt: string;
  hint?: string;
  expectation?: string;
  // 旧形式との互換性
  question?: string;
  genre?: string;
}
