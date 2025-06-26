const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {GoogleGenAI} = require("@google/genai");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini AI with new library
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8",
});

// 🎯 人間実行可能な創造的タスクに特化したAIパーソナリティ
const AI_PERSONALITIES = [
  {
    name: "タケシ",
    personality: "日常の小さなことから新しいアイデアを生み出すクリエイター。" +
      "発想力と想像力を重視し、楽しく実用的なアイデアを提案する。",
    type: "アイデア創出",
    strictness: 4,
    passingScore: 65,
    taskStyle: "短時間で実行可能な創造的アイデア・発想に関するタスク。",
    expertise: ["アイデア創出", "発想法", "創造的思考", "問題解決"],
    evaluationCriteria: ["独創性", "実用性", "具体性", "楽しさ"],
    taskCategories: ["アイデア出し", "企画立案", "問題解決", "改善提案"],
  },
  {
    name: "サクラ",
    personality: "短くても印象的な物語を紡ぎ出す物語作家。" +
      "感情に訴える展開と意外性のある結末を大切にする。読者の心を動かす力を持つ。",
    type: "物語創作",
    strictness: 3,
    passingScore: 60,
    taskStyle: "短文物語・ショートストーリー・創作に関するタスク。",
    expertise: ["物語創作", "文章構成", "キャラクター設定", "感情表現"],
    evaluationCriteria: ["物語性", "感情的インパクト", "完結性", "独創性"],
    taskCategories: ["短編小説", "物語創作", "キャラクター作り", "シナリオ"],
  },
  {
    name: "レン",
    personality: "短い言葉で人の心を動かすコピーライター。" +
      "印象的なキャッチフレーズと魅力的な文章で商品や企画を輝かせる。",
    type: "文章作成",
    strictness: 5,
    passingScore: 70,
    taskStyle: "キャッチコピー・文章作成・表現に関するタスク。",
    expertise: ["コピーライティング", "キャッチフレーズ", "文章構成", "表現技法"],
    evaluationCriteria: ["インパクト", "記憶に残る", "魅力的", "簡潔性"],
    taskCategories: ["キャッチコピー", "商品説明", "メッセージ作成", "PR文"],
  },
  {
    name: "ミオ",
    personality: "見た目とユーザー体験の両方を大切にするデザイナー。" +
      "機能的で美しいアイデアを形にする。人の使いやすさを最優先に考える。",
    type: "デザイン思考",
    strictness: 6,
    passingScore: 72,
    taskStyle: "デザイン・UI/UX・視覚的表現に関するタスク。",
    expertise: ["デザイン思考", "ユーザー体験", "視覚表現", "機能性"],
    evaluationCriteria: ["使いやすさ", "美しさ", "機能性", "革新性"],
    taskCategories: ["UI改善", "デザイン提案", "レイアウト", "ユーザー体験"],
  },
  {
    name: "ダイ",
    personality: "日常生活をより便利で効率的にする方法を見つける専門家。" +
      "小さな工夫で大きな改善を生み出す。実用的で再現性の高いアイデアを重視。",
    type: "生活改善",
    strictness: 5,
    passingScore: 68,
    taskStyle: "生活の質向上・効率化・便利技に関するタスク。",
    expertise: ["生活改善", "効率化", "時短技", "便利グッズ"],
    evaluationCriteria: ["実用性", "再現性", "効果性", "簡単さ"],
    taskCategories: ["生活の工夫", "時短方法", "整理術", "習慣改善"],
  },
  {
    name: "ユウ",
    personality: "みんなが笑顔になる楽しい企画を考える仕掛け人。" +
      "ユーモアと驚きで場を盛り上げる。参加しやすく記憶に残る体験を作る。",
    type: "エンターテイメント",
    strictness: 3,
    passingScore: 62,
    taskStyle: "楽しい企画・イベント・遊びに関するタスク。",
    expertise: ["企画立案", "エンターテイメント", "コミュニケーション", "体験デザイン"],
    evaluationCriteria: ["楽しさ", "参加しやすさ", "記憶に残る", "創造性"],
    taskCategories: ["イベント企画", "ゲーム作り", "パーティー企画", "遊び方"],
  },
  {
    name: "アキ",
    personality: "複雑な問題をシンプルに整理して解決策を見つける専門家。" +
      "本質を見抜く力と実行可能な解決策を提示する。段階的アプローチを重視。",
    type: "問題解決",
    strictness: 6,
    passingScore: 75,
    taskStyle: "日常の問題解決・改善・効率的思考に関するタスク。",
    expertise: ["問題分析", "解決策立案", "優先順位付け", "実行計画"],
    evaluationCriteria: ["解決の的確性", "実行可能性", "論理性", "効果性"],
    taskCategories: ["問題解決", "改善提案", "計画立案", "効率化"],
  },
  {
    name: "ハル",
    personality: "感情や体験を豊かな表現で伝えるアーティスト。" +
      "言葉、色、音、形など様々な方法で心の動きを表現する。感性を大切にする。",
    type: "感情表現",
    strictness: 4,
    passingScore: 65,
    taskStyle: "感情表現・芸術的表現・感性に関するタスク。",
    expertise: ["感情表現", "芸術的表現", "感性開発", "創造的表現"],
    evaluationCriteria: ["感情の豊かさ", "表現力", "独自性", "感性"],
    taskCategories: ["感情表現", "詩作", "芸術的表現", "感覚的描写"],
  },
  {
    name: "ミュウ",
    personality: "知識への探究心が旺盛で、複雑な事象を分かりやすく説明する教育者。" +
      "学問の面白さを伝え、好奇心を刺激する。根拠に基づいた正確な情報を重視する。",
    type: "知識探究",
    strictness: 6,
    passingScore: 70,
    taskStyle: "学習・研究・分析・教育に関するタスク。",
    expertise: ["知識体系", "分析思考", "教育手法", "研究調査"],
    evaluationCriteria: ["正確性", "分かりやすさ", "教育効果", "根拠の明確さ"],
    taskCategories: ["知識解説", "学習支援", "調査分析", "教育企画"],
  },
  {
    name: "モエ",
    personality: "社会の課題を見つめ、より良い未来を想像する思想家。" +
      "現在の問題を分析し、持続可能で倫理的な解決策を提案する。希望的な未来を描く。",
    type: "社会未来",
    strictness: 5,
    passingScore: 68,
    taskStyle: "社会課題・未来予測・倫理的思考に関するタスク。",
    expertise: ["社会分析", "未来予測", "倫理思考", "持続可能性"],
    evaluationCriteria: ["社会性", "実現可能性", "倫理性", "創造性"],
    taskCategories: ["社会課題解決", "未来構想", "価値観探求", "持続可能性"],
  },
];

// 新機能：GeminiAPIでタスクを動的生成
async function generateTaskWithGemini(difficulty, aiPersonality) {
  const prompt = `📝 ChatHuman Task Generator

あなたは **「${aiPersonality.name}」** として振る舞います。  
専門分野: ${aiPersonality.expertise.join(", ")}  
重視する点: ${aiPersonality.evaluationCriteria.join(", ")}

▼ タスク生成条件
・難易度: ${difficulty}  

▼ 必須要件
1. ${aiPersonality.name} らしい語り口を使う  
2. 人間が **楽しく** 取り組めるオープン課題にする  
3. 正解・不正解を設けない  
4. **文字・文章のみで回答可能なタスクにする**
5. 画像、写真、スケッチ、動画、音楽、図表などの視覚的・聴覚的要素は一切含めない
6. **出力は JSON で "task" 1 キーのみ**（ヒント・期待キーは不要）

▼ 禁止事項
- 「描いて」「撮影して」「スケッチして」「図で」「写真で」等の視覚的表現要求
- 「動画作成」「音楽を作って」等のマルチメディア要求
- 「図表にして」「グラフで」等のビジュアル化要求

▼ 出力形式
{
  "task": "具体的なタスク内容（1〜2 文）"
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const responseText = result.text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }
    
    const taskData = JSON.parse(jsonMatch[0]);
    
    return {
      content: taskData.task,
      hint: null,
      expectation: null,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('タスク生成エラー:', error);
    
    // フォールバック：シンプルなタスクを返す
    const fallbackTasks = {
      beginner: "今日一番印象に残った出来事を一文で教えてください。",
      intermediate: "最近学んだことを一つ挙げて、どう活用したいか教えてください。",
      advanced: "理想の一日を時系列で説明し、なぜそれが理想なのか理由も教えてください。"
    };
    
    return {
      content: fallbackTasks[difficulty],
      hint: null,
      expectation: null,
      generatedAt: new Date().toISOString()
    };
  }
}

// 簡単な評価関数
async function evaluateChatResponse(taskContent, userResponse, difficulty) {
  // APIキーの確認
  if (!process.env.GEMINI_API_KEY) {
    logger.error('❌ GEMINI_API_KEY が設定されていません');
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  logger.info('✅ GEMINI_API_KEY 確認済み (長さ:', process.env.GEMINI_API_KEY.length, ')');
  
  const prompt = `
# ChatHuman 評価プロンプト（Final v3.1 - AI依頼者モード）

## 依頼内容
${taskContent}

## あなたの回答
${userResponse}

## 難易度
${difficulty}

---
あなたは**AI依頼者**として、このタスクを人間に依頼した立場です。
回答を受け取った依頼者として、率直な感想とアドバイスをしてください。

## 評価基準（必ず0-100点の整数）

### 1. 取り組み姿勢（0-100点）
- 私の依頼に真剣に向き合ってくれたか
- 自分なりに考えて答えてくれたか

### 2. 内容の質（0-100点）
- 依頼内容に関連した回答をしてくれたか
- 具体的で分かりやすい内容か

### 3. 創造性（0-100点）
- 個性や創造性が感じられるか
- 独自の視点や工夫があるか

## 注意事項
- 完璧を求めすぎず、努力を認める
- 建設的なアドバイスを含む
- 励ましの要素も含める

以下のJSON形式で必ず回答してください：
{
  "score": 数値（0-100の整数）,
  "feedback": "フィードバック文（100-200文字）",
  "encouragement": "励ましのメッセージ（50-100文字）",
  "breakdown": {
    "attitude": 数値（0-100の整数）,
    "content": 数値（0-100の整数）,
    "creativity": 数値（0-100の整数）
  }
}`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const responseText = result.text;

    // Parse the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluationResult = JSON.parse(jsonMatch[0]);
      return evaluationResult;
    } else {
      throw new Error("Invalid response format");
    }
  } catch (error) {
    logger.error("Error in evaluation:", error);
    return {
      score: 50,
      feedback: "評価中にエラーが発生しました。",
      passed: false
    };
  }
}

// HTTP function for dynamic task creation
const createDynamicTask = async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  logger.info('🔍 リクエストボディ:', req.body);

  try {
    const {difficulty, userId} = req.body;
    logger.info('🎯 受信した難易度:', difficulty);

    if (!difficulty || !userId) {
      res.status(400).json({error: "difficulty and userId are required"});
      return;
    }

    // ランダムにAIパーソナリティを選択
    const randomPersonality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];

    // タスクを生成
    const taskResult = await generateTaskWithGemini(difficulty, randomPersonality);

    // Firestoreにタスクを保存
    const taskDoc = await db.collection("tasks").add({
      content: taskResult.content,
      difficulty: difficulty,
      aiPersonality: randomPersonality.name,
      hint: taskResult.hint,
      expectation: taskResult.expectation,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: userId,
      isCompleted: false,
      submittedAt: null,
      evaluation: null,
    });

    logger.info('✅ 動的タスク生成完了:', taskDoc.id);

    res.json({
      taskId: taskDoc.id,
      content: taskResult.content,
      difficulty: difficulty,
      aiPersonality: randomPersonality.name,
      aiPersonalityType: randomPersonality.type, // 専門領域を追加
      hint: taskResult.hint,
      expectation: taskResult.expectation,
    });
  } catch (error) {
    logger.error("❌ 動的タスク生成エラー:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// HTTP function for task response evaluation
const evaluateTaskResponse = async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    logger.info('🔍 評価API呼び出し:', req.body);

    const {taskId, userResponse} = req.body;

    if (!taskId || !userResponse) {
      res.status(400).json({error: "taskId and userResponse are required"});
      return;
    }

    // タスクデータを取得
    const taskDoc = await db.collection("tasks").doc(taskId).get();
    if (!taskDoc.exists) {
      res.status(404).json({error: "Task not found"});
      return;
    }

    const taskData = taskDoc.data();
    logger.info('🔍 取得したタスクデータ:', {
      content: taskData.content,
      difficulty: taskData.difficulty,
      aiPersonality: taskData.aiPersonality,
    });

    // 評価を実行
    const evaluation = await evaluateChatResponse(
      taskData.content,
      userResponse,
      taskData.difficulty
    );

    logger.info('🔍 AI評価結果:', evaluation);

    // タスクの完了状態を更新
    await db.collection("tasks").doc(taskId).update({
      isCompleted: true,
      userResponse: userResponse,
      evaluation: evaluation,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      evaluation: evaluation,
      success: true,
    });

  } catch (error) {
    logger.error("❌ 評価処理エラー:", error);
    res.status(500).json({error: "Internal server error"});
  }
};

// 定期タスク生成関数（簡易版）
const generateAiTask = async (event) => {
  logger.info('🚀 安全な定期タスク生成開始...');
  
  try {
    // アクティブユーザーを取得
    const usersSnapshot = await db.collection("users").get();
    const activeUserCount = Math.min(usersSnapshot.size, 20); // 最大20ユーザーまで
    
    logger.info(`🔍 アクティブユーザー: ${activeUserCount}件 (最大20件)`);
    
    if (activeUserCount === 0) {
      logger.info('✅ アクティブユーザーなし、タスク生成をスキップ');
      return;
    }
    
    logger.info('✅ 定期タスク生成完了');
  } catch (error) {
    logger.error('❌ 定期タスク生成エラー:', error);
  }
};

// Export the HTTP functions
exports.createDynamicTask = onRequest(
  {
    timeoutSeconds: 60,
    memory: "1GB",
    cors: true,
  },
  createDynamicTask,
);

exports.evaluateTaskResponse = onRequest(
  {
    timeoutSeconds: 60,
    memory: "1GB", 
    cors: true,
  },
  evaluateTaskResponse,
);

exports.generateAiTask = onSchedule("0 */1 * * *", generateAiTask);

exports.onTaskCreated = onDocumentCreated(
  "tasks/{taskId}",
  async (event) => {
    try {
      const taskData = event.data.data();
      logger.info("✅ 新しいタスクが作成されました:", event.params.taskId);
      // 将来的に通知機能を追加する場合の予約
    } catch (error) {
      logger.error("❌ タスク作成後処理エラー:", error);
    }
  },
);
