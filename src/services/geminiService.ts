import { Task } from '../types';

class GeminiService {
  private createDynamicTaskUrl: string;
  private evaluateTaskUrl: string;

  constructor() {
    const createDynamicTaskUrl = process.env.REACT_APP_CREATE_DYNAMIC_TASK_URL;
    const evaluateTaskUrl = process.env.REACT_APP_EVALUATE_TASK_URL;

    if (!createDynamicTaskUrl) {
      throw new Error('REACT_APP_CREATE_DYNAMIC_TASK_URL が設定されていません');
    }

    this.createDynamicTaskUrl = createDynamicTaskUrl;
    this.evaluateTaskUrl = evaluateTaskUrl || '';
  }

  // Cloud Functionsを使用してタスクを生成（メインの生成方法）
  async generateTaskWithCloudFunction(userId?: string, difficulty: string = 'beginner'): Promise<Task> {
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
      throw error;
    }
  }

  // 基本的なタスク評価
  async evaluateResponse(taskId: string, userResponse: string  ): Promise<{ 
    score: number; 
    feedback: string; 
    encouragement?: string;
    breakdown?: {
      attitude: number;
      content: number;
      creativity: number;
    }
  }> {
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
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      return {
        score: data.evaluation?.score || data.score || 0,
        feedback: data.evaluation?.feedback || data.feedback || '評価を取得できませんでした',
        encouragement: data.evaluation?.encouragement || data.encouragement,
        breakdown: data.evaluation?.breakdown || data.breakdown
      };
    } catch (error) {
      return {
        score: 0,
        feedback: '評価エラーが発生しました'
      };
    }
  }
}

export const geminiService = new GeminiService();