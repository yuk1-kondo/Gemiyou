// 環境変数を使用してCloud Functionsのみを利用するGeminiService
export interface AIPersonality {
  name: string;
  type: string;
  description: string;
  style: string;
}

export interface TaskRequest {
  id: string;
  personality: AIPersonality;
  requestText: string;
  createdAt: Date;
}

export interface TaskResponse {
  taskId: string;
  userResponse: string;
  evaluatedAt: Date;
  feedbackText: string;
  score?: number;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  evaluation?: ChatEvaluation;
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
  private evaluateTaskUrl: string;

  constructor() {
    this.createTaskUrl = process.env.REACT_APP_CREATE_TASK_URL || 'https://us-central1-gemiyou.cloudfunctions.net/createTask';
    this.createDynamicTaskUrl = process.env.REACT_APP_CREATE_DYNAMIC_TASK_URL || 'https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask';
    this.evaluateTaskUrl = process.env.REACT_APP_EVALUATE_TASK_URL || 'https://us-central1-gemiyou.cloudfunctions.net/evaluateTaskResponse';
    
    console.log('🔧 GeminiService 初期化 (Cloud Functions Only):');
    console.log('- Create Task URL:', this.createTaskUrl);
    console.log('- Create Dynamic Task URL:', this.createDynamicTaskUrl);
    console.log('- Evaluate Task URL:', this.evaluateTaskUrl);
  }

  // Cloud Functionsを使用してタスクを生成（メインの生成方法）
  async generateTaskWithCloudFunction(userId?: string, difficulty: string = 'beginner'): Promise<any> {
    try {
      console.log('🚀 動的タスク生成開始');
      console.log('📡 URL:', this.createDynamicTaskUrl);
      console.log('👤 User ID:', userId);
      console.log('📊 Difficulty:', difficulty);
      
      const requestBody = {
        userId: userId,
        difficulty: difficulty
      };
      console.log('📋 Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(this.createDynamicTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📡 レスポンス受信:', response.status, response.statusText);
      console.log('🔍 Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTPエラー:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ タスクデータ取得成功:', JSON.stringify(data, null, 2));
      
      if (!data.success) {
        throw new Error('タスク生成失敗: ' + (data.error || 'Unknown error'));
      }
      
      return data.task;
    } catch (error) {
      console.error('💥 Enhanced task generation error:', error);
      console.error('🔍 Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  // AI人格を生成（デフォルトまたはCloud Functions）
  async generatePersonality(): Promise<AIPersonality> {
    try {
      const task = await this.generateTaskWithCloudFunction();
      if (task.aiPersonality) {
        return {
          name: task.aiPersonality.name,
          type: task.aiPersonality.type,
          description: task.aiPersonality.personality,
          style: task.aiPersonality.taskStyle
        };
      }
    } catch (error) {
      console.warn('Cloud Functions人格生成エラー:', error);
    }
    
    // デフォルト人格
    return {
      name: 'ChatGPT先生',
      type: 'アシスタント',
      description: '親しみやすく分かりやすい先生',
      style: '簡潔で分かりやすい指示'
    };
  }

  // タスクを生成（Cloud Functions優先）
  async generateTask(personality: AIPersonality): Promise<string> {
    try {
      const task = await this.generateTaskWithCloudFunction();
      return task.request || task.content || 'タスクを実行してください。';
    } catch (error) {
      console.warn('Cloud Functions タスク生成エラー:', error);
      return `${personality.name}からの依頼: 今日感じた小さな幸せについて、短い詩を書いてください。`;
    }
  }

  // 回答を評価（シンプルなフォールバック）
  async evaluateResponse(personality: AIPersonality, taskRequest: string, userResponse: string): Promise<{ feedback: string; score: number }> {
    // デフォルト評価
    return {
      feedback: `${personality.name}より：素晴らしい回答をありがとうございました！`,
      score: 75
    };
  }

  // 新しいチャット対応タスク生成
  async generateChatTask(userId?: string, difficulty: string = 'beginner'): Promise<EnhancedTask> {
    try {
      const response = await fetch(this.createDynamicTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          difficulty: difficulty
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to generate chat task');
      }

      return {
        id: data.task.id || data.taskId || 'task-' + Date.now(),
        personality: {
          name: data.task.aiPersonality?.name || 'AI先生',
          type: data.task.aiPersonality?.type || 'アシスタント',
          description: data.task.aiPersonality?.personality || '親切なAI',
          style: data.task.aiPersonality?.taskStyle || '丁寧な指導'
        },
        requestText: data.task.request || data.task.content || 'タスクを実行してください',
        createdAt: new Date(),
        aiPersonality: data.task.aiPersonality || {
          name: 'AI先生',
          type: 'アシスタント',
          personality: '親切で分かりやすい先生',
          strictness: 5,
          passingScore: 70,
          taskStyle: '丁寧で優しい指導'
        },
        chatHistory: [],
        isCompleted: false,
        totalScore: 0,
        attempts: 0
      };
    } catch (error) {
      console.error('Chat task generation error:', error);
      throw new Error('チャットタスクの生成に失敗しました');
    }
  }

  // チャット応答の評価
  async evaluateChatResponse(
    taskId: string, 
    userId: string, 
    userResponse: string, 
    chatHistory: ChatMessage[]
  ): Promise<ChatEvaluation> {
    try {
      const response = await fetch(`${this.createTaskUrl}/evaluateChatResponse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          userId,
          userResponse,
          chatHistory: chatHistory.map(msg => ({
            sender: msg.sender,
            content: msg.content,
            timestamp: msg.timestamp
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to evaluate chat response');
      }

      return data.evaluation;
    } catch (error) {
      console.error('Chat evaluation error:', error);
      
      // フォールバック評価
      return {
        score: 75,
        passed: true,
        feedback: '素晴らしい回答をありがとうございました！',
        nextAction: 'continue',
        aiResponse: 'とても良い回答ですね。',
        improvementPoints: [],
        strengths: ['創造性', '表現力'],
        detailedAnalysis: 'よくできています。',
        attemptNumber: 1
      };
    }
  }
}

export const geminiService = new GeminiService();
