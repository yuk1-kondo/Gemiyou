import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI | null;
  private createTaskUrl: string;
  private createChatTaskUrl: string;
  private isApiKeyConfigured: boolean;

  constructor() {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    this.createTaskUrl = process.env.REACT_APP_CREATE_TASK_URL || '';
    this.createChatTaskUrl = process.env.REACT_APP_CREATE_CHAT_TASK_URL || '';
    
    console.log('🔧 GeminiService 初期化:');
    console.log('- API Key:', apiKey ? '設定済み' : '未設定');
    console.log('- Create Task URL:', this.createTaskUrl);
    console.log('- Create Chat Task URL:', this.createChatTaskUrl);
    
    this.isApiKeyConfigured = !!(apiKey && apiKey !== 'your_gemini_api_key_here');
    
    if (this.isApiKeyConfigured) {
      this.genAI = new GoogleGenerativeAI(apiKey!);
    } else {
      console.warn('⚠️ Gemini API key is not configured. Using Cloud Functions only.');
      this.genAI = null;
    }
    
    if (!this.createChatTaskUrl) {
      console.warn('⚠️ Create Chat Task URL is not configured');
    }
  }

  // Cloud Functionsを使用してタスクを生成（メインの生成方法）
  async generateTaskWithCloudFunction(): Promise<any> {
    try {
      console.log('🚀 タスク生成開始:', this.createChatTaskUrl);
      
      const response = await fetch(this.createChatTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 レスポンス受信:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTPエラー:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ タスクデータ取得成功:', data);
      
      if (!data.success) {
        throw new Error('タスク生成失敗: ' + (data.error || 'Unknown error'));
      }
      
      return data.task;
    } catch (error) {
      console.error('💥 Enhanced task generation error:', error);
      throw error;
    }
  }

  // AI人格を生成（Cloud Functions優先）
  async generatePersonality(): Promise<AIPersonality> {
    // Cloud Functionsにタスクを依頼してそこから人格を取得
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
    
    // フォールバック：ローカルAPI使用またはデフォルト
    if (this.isApiKeyConfigured && this.genAI) {
      return this.generatePersonalityWithAPI();
    }
    
    // デフォルトの人格
    return {
      name: 'ChatGPT先生',
      type: 'アシスタント',
      description: '親しみやすく分かりやすい先生',
      style: '簡潔で分かりやすい指示'
    };
  }

  // APIを使用したローカル人格生成
  private async generatePersonalityWithAPI(): Promise<AIPersonality> {
    if (!this.genAI) {
      throw new Error('Gemini API not available');
    }
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
あなたはAI人格ジェネレーターです。
以下の形式でユニークなAI人格を1つ生成してください：

名前: [AI名前]
タイプ: [詩人/哲学者/芸術家/科学者/ツンデレ/スパルタなど]
説明: [そのAIの特徴や性格を50文字程度で]
スタイル: [話し方の特徴を30文字程度で]

例：
名前: ルクレール
タイプ: 詩人AI
説明: 感情豊かで繊細、美しい言葉を愛する詩的なAI
スタイル: 丁寧で美しい表現を使う
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // レスポンスをパース（簡単な実装）
      const lines = text.split('\n').filter(line => line.trim());
      
      return {
        name: this.extractValue(lines, '名前') || 'AIアシスタント',
        type: this.extractValue(lines, 'タイプ') || '汎用AI',
        description: this.extractValue(lines, '説明') || '親切なAIです',
        style: this.extractValue(lines, 'スタイル') || '丁寧な話し方'
      };
    } catch (error) {
      console.error('AI人格生成エラー:', error);
      // フォールバック人格
      return {
        name: 'アリア',
        type: '詩人AI',
        description: '美しい言葉と感情を大切にするAI',
        style: '優雅で詩的な表現'
      };
    }
  }

  // タスクを生成（Cloud Functions優先）
  async generateTask(personality: AIPersonality): Promise<string> {
    // Cloud Functionsを最優先で使用
    try {
      const task = await this.generateTaskWithCloudFunction();
      return task.request || task.content || 'タスクを実行してください。';
    } catch (error) {
      console.warn('Cloud Functions タスク生成エラー:', error);
    }
    
    // フォールバック：ローカルAPI使用
    if (this.isApiKeyConfigured && this.genAI) {
      return this.generateTaskWithAPI(personality);
    }
    
    // 最終フォールバック
    return `${personality.name}からの依頼: 今日感じた小さな幸せについて、短い詩を書いてください。`;
  }

  // APIを使用したローカルタスク生成
  private async generateTaskWithAPI(personality: AIPersonality): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not available');
    }
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
あなたは${personality.name}という${personality.type}です。
性格: ${personality.description}
話し方: ${personality.style}

人間（Chatヒューマン）に対して、あなたらしいタスクを1つ依頼してください。
依頼内容は以下のようなものにしてください：
- 詩や文章の作成
- 創作的な課題
- 感情的な表現
- 哲学的な問いかけ
- 芸術的な創造

依頼文は100文字程度で、あなたの人格が表れるような文体で書いてください。
「〜してください」で終わる形で、具体的で実行可能な内容にしてください。
`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('タスク生成エラー:', error);
      return `${personality.name}からの依頼: 今日感じた小さな幸せについて、短い詩を書いてください。`;
    }
  }

  // 回答を評価（Cloud Functions優先）
  async evaluateResponse(personality: AIPersonality, taskRequest: string, userResponse: string): Promise<{ feedback: string; score: number }> {
    // Cloud Functions使用を試行
    // 現在はローカル評価のみ実装
    
    if (this.isApiKeyConfigured && this.genAI) {
      return this.evaluateResponseWithAPI(personality, taskRequest, userResponse);
    }
    
    // デフォルト評価
    return {
      feedback: `${personality.name}より：素晴らしい回答をありがとうございました！`,
      score: 75
    };
  }

  // APIを使用したローカル評価
  private async evaluateResponseWithAPI(personality: AIPersonality, taskRequest: string, userResponse: string): Promise<{ feedback: string; score: number }> {
    if (!this.genAI) {
      throw new Error('Gemini API not available');
    }
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
あなたは${personality.name}という${personality.type}です。
性格: ${personality.description}
話し方: ${personality.style}

以下の依頼を人間に出しました：
「${taskRequest}」

人間からの回答：
「${userResponse}」

この回答を評価してください：
1. 100点満点で点数をつけてください
2. 200文字以内でフィードバックをください
3. あなたの人格を表現した文体で書いてください
4. 建設的で励ましの要素も含めてください

回答形式：
点数: [0-100の数字]
フィードバック: [あなたらしい評価コメント]
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const scoreMatch = text.match(/点数:\s*(\d+)/);
      const feedbackMatch = text.match(/フィードバック:\s*(.+)/);
      
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : `${personality.name}より：素晴らしい回答をありがとうございました！`;
      
      return { feedback, score };
    } catch (error) {
      console.error('評価生成エラー:', error);
      return {
        feedback: `${personality.name}より：お疲れ様でした。次回も期待しています！`,
        score: 75
      };
    }
  }

  // 新しいチャット対応タスク生成
  async generateChatTask(): Promise<EnhancedTask> {
    try {
      const response = await fetch(this.createChatTaskUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to generate chat task');
      }

      return {
        id: data.task.id || data.taskId,
        personality: {
          name: data.task.aiPersonality.name,
          type: data.task.aiPersonality.type,
          description: data.task.aiPersonality.personality,
          style: data.task.aiPersonality.taskStyle
        },
        requestText: data.task.request,
        createdAt: new Date(),
        aiPersonality: data.task.aiPersonality,
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
      throw new Error('チャット評価に失敗しました');
    }
  }

  private extractValue(lines: string[], key: string): string | null {
    const line = lines.find(l => l.includes(key));
    if (line) {
      const parts = line.split(':');
      return parts.length > 1 ? parts[1].trim() : null;
    }
    return null;
  }
}

export const geminiService = new GeminiService();
