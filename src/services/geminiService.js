class GeminiService {
  constructor() {
    const createDynamicTaskUrl = process.env.REACT_APP_CREATE_DYNAMIC_TASK_URL;
    const evaluateTaskUrl = process.env.REACT_APP_EVALUATE_TASK_URL;

    if (!createDynamicTaskUrl) {
      console.warn('⚠️ REACT_APP_CREATE_DYNAMIC_TASK_URL が設定されていません。ローカル開発用のデフォルトURLを使用します。');
      this.createDynamicTaskUrl = 'https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask';
    } else {
      this.createDynamicTaskUrl = createDynamicTaskUrl;
    }

    this.evaluateTaskUrl = evaluateTaskUrl || 'https://us-central1-gemiyou.cloudfunctions.net/evaluateTaskResponse';
  }

  // Cloud Functionsを使用してタスクを生成（メインの生成方法）
  async generateTaskWithCloudFunction(userId, difficulty = 'beginner') {
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
      
      // Cloud Functionsからの実際のレスポンス形式に合わせて修正
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Cloud Functionsのレスポンス形式に合わせて調整
      return {
        id: data.taskId,
        content: data.content,
        difficulty: data.difficulty,
        aiPersonality: data.aiPersonality,
        aiPersonalityType: data.aiPersonalityType, // 専門領域を追加
        hint: data.hint,
        expectation: data.expectation,
        genre: data.aiPersonality // UI表示用（名前）
      };
    } catch (error) {
      throw error;
    }
  }

  // 基本的なタスク評価
  async evaluateResponse(taskId, userResponse) {
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
