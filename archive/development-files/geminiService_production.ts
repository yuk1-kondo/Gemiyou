import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TaskRequest {
  id: string;
  userId: string;
  content: string;
  hint?: string;
  expectation?: string;
  aiPersonality?: any;
  difficulty: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  generatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ChatEvaluation {
  score: number;
  passed: boolean;
  feedback: string;
  nextAction: 'continue' | 'complete';
  aiResponse?: string;
  improvementPoints?: string[];
  strengths?: string[];
  detailedAnalysis?: string;
  attemptNumber?: number;
}

export interface EnhancedTask extends TaskRequest {
  aiPersonality: {
    name: string;
    type: string;
    personality: string;
    strictness: number;
    passingScore: number;
    taskStyle: string;
  };
  chatHistory: ChatMessage[];
  isCompleted: boolean;
  totalScore: number;
  attempts: number;
}

class GeminiService {
  private createTaskUrl: string;
  private createDynamicTaskUrl: string;
  private createChatTaskUrl: string;
  private evaluateTaskUrl: string;

  constructor() {
    const createTaskUrl = process.env.REACT_APP_CREATE_TASK_URL;
    const createDynamicTaskUrl = process.env.REACT_APP_CREATE_DYNAMIC_TASK_URL;
    const createChatTaskUrl = process.env.REACT_APP_CREATE_CHAT_TASK_URL;
    const evaluateTaskUrl = process.env.REACT_APP_EVALUATE_TASK_URL;

    if (!createDynamicTaskUrl) {
      throw new Error('REACT_APP_CREATE_DYNAMIC_TASK_URL が設定されていません');
    }

    this.createTaskUrl = createTaskUrl || '';
    this.createDynamicTaskUrl = createDynamicTaskUrl;
    this.createChatTaskUrl = createChatTaskUrl || '';
    this.evaluateTaskUrl = evaluateTaskUrl || '';
  }

  // Cloud Functionsを使用してタスクを生成（メインの生成方法）
  async generateTaskWithCloudFunction(userId?: string, difficulty: string = 'beginner'): Promise<any> {
    try {
      const requestBody = {
        userId: userId,
        difficulty: difficulty
      };
      
      const response = await fetch(this.createDynamicTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'タスク生成に失敗しました');
      }
      
      return data.task;
    } catch (error) {
      console.error('タスク生成エラー:', error);
      throw error;
    }
  }

  // 旧バージョンとの互換性のため
  async generateTask(): Promise<TaskRequest> {
    try {
      const task = await this.generateTaskWithCloudFunction();
      return task;
    } catch (error) {
      console.error('Generate task error:', error);
      throw error;
    }
  }

  // チャット機能付きタスク生成
  async generateChatTask(userId: string, difficulty: string = 'beginner'): Promise<EnhancedTask> {
    try {
      const task = await this.generateTaskWithCloudFunction();
      
      return {
        ...task,
        chatHistory: [],
        isCompleted: false,
        totalScore: 0,
        attempts: 0
      };
    } catch (error) {
      console.error('Chat task generation error:', error);
      throw error;
    }
  }

  // チャット応答の評価
  async evaluateChatResponse(
    taskId: string,
    userMessage: string,
    chatHistory: ChatMessage[]
  ): Promise<ChatEvaluation> {
    try {
      const response = await fetch(this.evaluateTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          userMessage,
          chatHistory
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return data.evaluation;
    } catch (error) {
      console.error('Chat evaluation error:', error);
      throw error;
    }
  }

  // 基本的なタスク評価
  async evaluateResponse(taskId: string, userResponse: string): Promise<{ score: number; feedback: string }> {
    try {
      const response = await fetch(this.evaluateTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          userResponse
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      return {
        score: data.score || 0,
        feedback: data.feedback || '評価を取得できませんでした'
      };
    } catch (error) {
      console.error('Response evaluation error:', error);
      return {
        score: 0,
        feedback: '評価エラーが発生しました'
      };
    }
  }
}

export const geminiService = new GeminiService();
