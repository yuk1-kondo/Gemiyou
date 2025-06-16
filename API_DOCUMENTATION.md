# 🔧 Gemiyou ChatHuman - API仕様・テクニカルドキュメント

> **対象**: 開発者・システム管理者・次期AI開発者  
> **バージョン**: 1.0.0  
> **最終更新**: 2025年6月16日

## 🌐 API エンドポイント

### Base URL
```
Firebase Functions: https://us-central1-gemiyou.cloudfunctions.net
```

### 認証
```
認証方式: なし（匿名アクセス）
CORS: 全ドメイン許可設定済み
```

## 📋 API 仕様詳細

### 1. タスク生成API

#### `POST /generateAITask`
AIが創造的なタスクを生成します。

**リクエスト**:
```json
{
  "aiPersonality": "アイデア発想・タケシ",
  "difficulty": "standard",
  "userHistory": [],
  "context": {
    "timeOfDay": "afternoon",
    "season": "spring"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "task": {
    "id": "task_123456789",
    "request": "新しいカフェのコンセプトを3つ考えて、それぞれの特徴を説明してください",
    "context": "多様化する現代のライフスタイルに合わせて...",
    "expectedOutput": "各コンセプト50-100文字程度、合計3つ",
    "tips": "利用者の視点に立って、具体的な特徴を考えてみましょう",
    "difficultyLevel": {
      "name": "スタンダード",
      "complexity": 3,
      "timeLimit": "10-15分",
      "requiredSkills": ["創造的思考", "コンセプト設計"]
    },
    "category": "アイデア創出系",
    "aiPersonality": {
      "name": "アイデア発想・タケシ",
      "type": "アイデア発想",
      "personality": "自由な発想とブレインストーミングの専門家"
    },
    "evaluationFocus": ["独創性", "実現可能性", "具体性"]
  },
  "metadata": {
    "generatedAt": "2025-06-16T10:30:00Z",
    "processingTime": 2.3
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "タスク生成に失敗しました",
    "details": "API制限またはシステムエラー"
  }
}
```

### 2. タスク評価API

#### `POST /evaluateResponse`
ユーザーの回答を評価し、フィードバックを生成します。

**リクエスト**:
```json
{
  "taskId": "task_123456789",
  "taskData": {
    "request": "新しいカフェのコンセプトを3つ考えて...",
    "difficultyLevel": {
      "name": "スタンダード",
      "complexity": 3
    },
    "aiPersonality": {
      "name": "アイデア発想・タケシ"
    }
  },
  "userResponse": "1. 本とコーヒーが楽しめる読書カフェ...",
  "evaluationContext": {
    "submittedAt": "2025-06-16T10:45:00Z"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "evaluation": {
    "overallScore": 85,
    "breakdown": {
      "creativity": {
        "score": 90,
        "comment": "独創的なアイデアが豊富で、従来にない視点が素晴らしい"
      },
      "practicality": {
        "score": 80,
        "comment": "実現可能性が高く、具体的な運営方法も考慮されている"
      },
      "completeness": {
        "score": 85,
        "comment": "3つのコンセプト全てが詳細に説明されており完成度が高い"
      }
    },
    "detailedFeedback": {
      "strengths": [
        "各コンセプトが明確に差別化されている",
        "ターゲット層の設定が具体的",
        "実現可能な運営方法の提案"
      ],
      "improvements": [
        "収益性の観点も追加できるとより良い",
        "競合との差別化をより明確に"
      ],
      "encouragement": "創造性豊かな提案で、実際に実現してみたいコンセプトばかりです！"
    },
    "nextSteps": [
      "気に入ったコンセプトを更に詳細に発展させてみましょう",
      "実際の立地や資金計画も考えてみると面白いかもしれません"
    ]
  },
  "metadata": {
    "evaluatedAt": "2025-06-16T10:46:00Z",
    "processingTime": 3.1,
    "evaluatorPersonality": "アイデア発想・タケシ"
  }
}
```

### 3. チャットタスク生成API

#### `POST /createChatTask`
対話形式でのタスク生成（軽量版）

**リクエスト**:
```json
{
  "message": "クリエイティブなタスクを出して",
  "context": {
    "previousTasks": [],
    "userPreference": "short"
  }
}
```

### 4. 通知テストAPI

#### `POST /testNotification`
プッシュ通知機能のテスト

**リクエスト**:
```json
{
  "fcmToken": "user_fcm_token_here",
  "message": "新しいタスクが準備できました！"
}
```

## 🗄️ データベース設計

### Firestore Collections

#### `tasks` Collection
```javascript
{
  "id": "task_123456789",
  "request": "タスクの内容",
  "context": "背景説明",
  "expectedOutput": "期待する成果物",
  "tips": "取り組みのヒント",
  "difficultyLevel": {
    "name": "スタンダード",
    "complexity": 3,
    "timeLimit": "10-15分",
    "requiredSkills": ["創造的思考"]
  },
  "category": "アイデア創出系",
  "aiPersonality": {
    "name": "アイデア発想・タケシ",
    "type": "アイデア発想"
  },
  "evaluationFocus": ["独創性", "実現可能性"],
  "createdAt": "2025-06-16T10:30:00Z",
  "status": "active"
}
```

#### `responses` Collection
```javascript
{
  "id": "response_123456789",
  "taskId": "task_123456789",
  "userId": "anonymous_user_id",
  "content": "ユーザーの回答内容",
  "evaluation": {
    "overallScore": 85,
    "breakdown": { /* 詳細評価 */ },
    "feedback": "詳細なフィードバック"
  },
  "submittedAt": "2025-06-16T10:45:00Z",
  "evaluatedAt": "2025-06-16T10:46:00Z"
}
```

#### `users` Collection
```javascript
{
  "id": "anonymous_user_id",
  "createdAt": "2025-06-16T10:00:00Z",
  "preferences": {
    "preferredDifficulty": "standard",
    "favoritePersonalities": ["アイデア発想・タケシ"]
  },
  "statistics": {
    "totalTasks": 15,
    "averageScore": 82,
    "favoriteCategories": ["アイデア創出系"]
  }
}
```

## 🎭 AI人格システム

### 人格定義構造
```javascript
const aiPersonalities = {
  "アイデア発想・タケシ": {
    name: "アイデア発想・タケシ",
    type: "アイデア発想",
    personality: "自由な発想とブレインストーミングの専門家",
    expertise: ["ブレインストーミング", "アイデア展開", "創造的思考"],
    taskStyle: "制約を設けず自由に発想できる環境を提供",
    evaluationCriteria: ["独創性", "実現可能性", "具体性"],
    preferredDifficulties: ["easy", "standard", "intermediate"],
    categoryWeights: {
      "アイデア創出系": 0.4,
      "問題解決・改善系": 0.3,
      "表現・デザイン系": 0.3
    }
  }
  // ... 他7種類
};
```

### 難易度システム
```javascript
const difficultyLevels = {
  beginner: {
    name: "ビギナー",
    complexity: 1,
    timeLimit: "3-5分",
    description: "気軽に始められる簡単なタスク",
    requiredSkills: ["基本的思考"],
    taskComplexity: "simple",
    expectedOutputLength: "短文（50-100文字）"
  },
  // ... 他4レベル
};
```

## 🛡️ セキュリティ・制限事項

### API制限
```javascript
// レート制限
const rateLimits = {
  generateTask: "10回/分",
  evaluateResponse: "5回/分",
  testNotification: "3回/分"
};

// データサイズ制限
const sizeLimits = {
  userResponse: "10KB",
  taskRequest: "5KB",
  totalRequest: "50KB"
};
```

### CORS設定
```javascript
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods", 
            "value": "GET,POST,OPTIONS"
          }
        ]
      }
    ]
  }
}
```

## 📊 パフォーマンス指標

### レスポンス時間目標
- **タスク生成**: 3秒以内
- **評価処理**: 5秒以内
- **通知送信**: 1秒以内

### 可用性
- **稼働率**: 99.9%目標
- **エラー率**: 1%以下
- **回復時間**: 5分以内

## 🔧 開発・デバッグ

### ローカル開発
```bash
# Functions エミュレータ
firebase emulators:start --only functions

# フロントエンド開発サーバー
npm start

# 統合テスト
npm run test:integration
```

### ログ・モニタリング
```bash
# Firebase Functions ログ
firebase functions:log

# リアルタイムログ
firebase functions:log --follow
```

### テスト用cURL例
```bash
# タスク生成テスト
curl -X POST \
  https://us-central1-gemiyou.cloudfunctions.net/generateAITask \
  -H "Content-Type: application/json" \
  -d '{
    "aiPersonality": "アイデア発想・タケシ",
    "difficulty": "standard"
  }'

# 評価テスト
curl -X POST \
  https://us-central1-gemiyou.cloudfunctions.net/evaluateResponse \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test_task",
    "userResponse": "テスト回答",
    "taskData": {...}
  }'
```

## 🔄 バージョン管理・更新

### バージョニング
```
メジャー.マイナー.パッチ
1.0.0 - 初期リリース
1.1.0 - 新機能追加
1.0.1 - バグ修正
```

### デプロイメント
```bash
# Functions デプロイ
firebase deploy --only functions

# Hosting デプロイ
firebase deploy --only hosting

# 全体デプロイ
firebase deploy
```

## 📈 監視・アラート

### 重要メトリクス
- API呼び出し回数
- エラー発生率
- レスポンス時間
- ユーザー数

### アラート設定
- エラー率 > 5%
- レスポンス時間 > 10秒
- API制限到達

---

**このドキュメントにより、技術者は完全にシステムを理解し、保守・拡張を行うことができます。**

**技術サポート**: GitHub Issues  
**更新頻度**: 月次レビュー  
**責任者**: 開発チーム
