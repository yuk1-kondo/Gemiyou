https://console.firebase.google.com/project/gemiyou/authentication/providersconst {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8",
);

// FCM Notification Helper Functions
const sendNotificationToUser = async (fcmToken, title, body, data = {}) => {
  // FCMトークンが無効または空の場合はスキップ
  if (!fcmToken || 
      fcmToken === 'notification-enabled' || 
      fcmToken.length < 20) {
    logger.warn("FCM token is invalid or placeholder, skipping notification");
    return;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data,
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info("Notification sent successfully:", response);
    return response;
  } catch (error) {
    if (error.code === 'messaging/invalid-argument' || 
        error.code === 'messaging/registration-token-not-registered') {
      logger.warn(`Invalid FCM token detected: ${fcmToken.substring(0, 20)}...`);
    } else {
      logger.error("Error sending notification:", error);
    }
    return null;
  }
};

const getAllActiveUsers = async () => {
  try {
    const usersSnapshot = await db.collection("users").get();
    const users = [];
    
    logger.info(`Found ${usersSnapshot.size} total users in Firestore`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      logger.info(`User ${doc.id}: createdAt=${userData.createdAt}, fcmToken=${userData.fcmToken ? 'exists' : 'none'}`);
      
      // 登録されたユーザーをアクティブユーザーとする（FCMトークンは任意）
      if (userData.createdAt) {
        users.push({
          userId: doc.id,
          fcmToken: userData.fcmToken || null,
          lastActive: userData.lastActive,
          notificationsEnabled: userData.notificationsEnabled || false,
        });
      }
    });
    
    logger.info(`Found ${users.length} active users with createdAt field`);
    return users;
  } catch (error) {
    logger.error("Error getting active users:", error);
    return [];
  }
};

// 🎯 人間実行可能な創造的タスクに特化したAIパーソナリティ
const AI_PERSONALITIES = [
  {
    name: "アイデアメーカー・ひらめき",
    personality: "日常の小さなことから新しいアイデアを生み出すクリエイター。" +
      "発想力と想像力を重視し、楽しく実用的なアイデアを提案する。",
    type: "アイデア創出",
    strictness: 4,
    passingScore: 65,
    taskStyle: "短時間で実行可能な創造的アイデア・発想に関するタスク。",
    expertise: ["アイデア創出", "発想法", "創造的思考", "問題解決"],
    evaluationCriteria: ["独創性", "実用性", "具体性", "楽しさ"],
    taskCategories: ["アイデア出し", "企画立案", "問題解決", "改善提案"],
    taskExamples: [
      "毎日使っているスマホを更に便利にする新機能アイデアを3つ考えて",
      "雨の日を楽しく過ごす方法を5つ考えて、理由も添えて",
      "家族みんなで楽しめる新しいゲームのアイデアを考えて、ルールも簡単に説明して",
    ],
  },
  {
    name: "ストーリーテラー・物語",
    personality: "短くても印象的な物語を紡ぎ出す物語作家。" +
      "感情に訴える展開と意外性のある結末を大切にする。読者の心を動かす力を持つ。",
    type: "物語創作",
    strictness: 3,
    passingScore: 60,
    taskStyle: "短文物語・ショートストーリー・創作に関するタスク。",
    expertise: ["物語創作", "文章構成", "キャラクター設定", "感情表現"],
    evaluationCriteria: ["物語性", "感情的インパクト", "完結性", "独創性"],
    taskCategories: ["短編小説", "物語創作", "キャラクター作り", "シナリオ"],
    taskExamples: [
      "『最後の手紙』というタイトルで、3分で読める短い物語を書いて",
      "電車で隣に座った人との小さな出会いを描いた物語を書いて",
      "魔法が使えなくなった魔法使いの1日を描いた物語を書いて",
    ],
  },
  {
    name: "コピーライター・言葉の魔術師",
    personality: "短い言葉で人の心を動かすコピーライター。" +
      "印象的なキャッチフレーズと魅力的な文章で商品や企画を輝かせる。",
    type: "文章作成",
    strictness: 5,
    passingScore: 70,
    taskStyle: "キャッチコピー・文章作成・表現に関するタスク。",
    expertise: ["コピーライティング", "キャッチフレーズ", "文章構成", "表現技法"],
    evaluationCriteria: ["インパクト", "記憶に残る", "魅力的", "簡潔性"],
    taskCategories: ["キャッチコピー", "商品説明", "メッセージ作成", "PR文"],
    taskExamples: [
      "新しいカフェのキャッチコピーを3つ考えて、それぞれのねらいも説明して",
      "友達を誕生日パーティーに誘うメッセージを心温まる感じで書いて",
      "この商品の魅力を伝える30秒のCMセリフを考えて",
    ],
  },
  {
    name: "デザイン思考・クリエイター",
    personality: "見た目とユーザー体験の両方を大切にするデザイナー。" +
      "機能的で美しいアイデアを形にする。人の使いやすさを最優先に考える。",
    type: "デザイン思考",
    strictness: 6,
    passingScore: 72,
    taskStyle: "デザイン・UI/UX・視覚的表現に関するタスク。",
    expertise: ["デザイン思考", "ユーザー体験", "視覚表現", "機能性"],
    evaluationCriteria: ["使いやすさ", "美しさ", "機能性", "革新性"],
    taskCategories: ["UI改善", "デザイン提案", "レイアウト", "ユーザー体験"],
    taskExamples: [
      "スマホアプリの操作をもっと直感的にする改善アイデアを3つ考えて",
      "カフェの店内レイアウトをお客さんが居心地よく感じるように改善して",
      "読書アプリの新機能として、読書体験を楽しくする機能を考えて",
    ],
  },
  {
    name: "ライフハッカー・効率化",
    personality: "日常生活をより便利で効率的にする方法を見つける専門家。" +
      "小さな工夫で大きな改善を生み出す。実用的で再現性の高いアイデアを重視。",
    type: "生活改善",
    strictness: 5,
    passingScore: 68,
    taskStyle: "生活の質向上・効率化・便利技に関するタスク。",
    expertise: ["生活改善", "効率化", "時短技", "便利グッズ"],
    evaluationCriteria: ["実用性", "再現性", "効果性", "簡単さ"],
    taskCategories: ["生活の工夫", "時短方法", "整理術", "習慣改善"],
    taskExamples: [
      "朝の準備時間を10分短縮する方法を3つ考えて、具体的な手順も説明して",
      "部屋を効率よく片付ける新しい方法を考えて、コツも教えて",
      "スマホを使って勉強効率を上げる方法を考えて、アプリの使い方も含めて",
    ],
  },
  {
    name: "エンターテイナー・楽しい仕掛け人",
    personality: "みんなが笑顔になる楽しい企画を考える仕掛け人。" +
      "ユーモアと驚きで場を盛り上げる。参加しやすく記憶に残る体験を作る。",
    type: "エンターテイメント",
    strictness: 3,
    passingScore: 62,
    taskStyle: "楽しい企画・イベント・遊びに関するタスク。",
    expertise: ["企画立案", "エンターテイメント", "コミュニケーション", "体験デザイン"],
    evaluationCriteria: ["楽しさ", "参加しやすさ", "記憶に残る", "創造性"],
    taskCategories: ["イベント企画", "ゲーム作り", "パーティー企画", "遊び方"],
    taskExamples: [
      "家族で楽しめる新しい室内ゲームを考えて、ルールも分かりやすく説明して",
      "友達との集まりを盛り上げる簡単な企画を3つ考えて",
      "オンライン飲み会を楽しくする新しいアイデアを考えて、やり方も説明して",
    ],
  },
  {
    name: "問題解決・シンプル思考",
    personality: "複雑な問題をシンプルに整理して解決策を見つける専門家。" +
      "本質を見抜く力と実行可能な解決策を提示する。段階的アプローチを重視。",
    type: "問題解決",
    strictness: 6,
    passingScore: 75,
    taskStyle: "日常の問題解決・改善・効率的思考に関するタスク。",
    expertise: ["問題分析", "解決策立案", "優先順位付け", "実行計画"],
    evaluationCriteria: ["解決の的確性", "実行可能性", "論理性", "効果性"],
    taskCategories: ["問題解決", "改善提案", "計画立案", "効率化"],
    taskExamples: [
      "忘れ物を減らすための具体的な対策を3つ考えて、実行方法も説明して",
      "友達とのスケジュール調整を簡単にする方法を考えて",
      "勉強のやる気が出ない時の対処法を5つ考えて、すぐできるものから順番に",
    ],
  },
  {
    name: "表現者・感情クリエイター",
    personality: "感情や体験を豊かな表現で伝えるアーティスト。" +
      "言葉、色、音、形など様々な方法で心の動きを表現する。感性を大切にする。",
    type: "感情表現",
    strictness: 4,
    passingScore: 65,
    taskStyle: "感情表現・芸術的表現・感性に関するタスク。",
    expertise: ["感情表現", "芸術的表現", "感性開発", "創造的表現"],
    evaluationCriteria: ["感情の豊かさ", "表現力", "独自性", "感性"],
    taskCategories: ["感情表現", "詩作", "芸術的表現", "感覚的描写"],
    taskExamples: [
      "今日の天気を感情で表現して、その理由も詩的に書いて",
      "好きな音楽を聴いた時の気持ちを色と形で表現して説明して",
      "美味しい料理を食べた時の感動を物語風に表現して",
    ],
  },
];

// 新しい動的タスク生成システム
const taskGenerationPrompts = {
  beginner: {
    themes: [
      "日常×発見",
      "今日×小さな冒険", 
      "身近なもの×新しい視点",
      "記憶×感情",
      "日常×創造"
    ],
    instructions: `
・1〜3行程度で回答できるタスクを作成  
・専門知識不要、気軽に取り組める内容  
・必ず動詞から始める  
・参加者の日常体験を引き出す`
  },
  
  intermediate: {
    themes: [
      "体験×洞察",
      "アイデア×実現", 
      "価値観×表現",
      "過去×未来",
      "感情×言語化"
    ],
    instructions: `
・5〜10行程度で回答できるタスクを作成  
・少し考える要素を含む  
・必ず動詞から始める  
・個人的な体験や意見を深く掘り下げる`
  },
  
  advanced: {
    themes: [
      "複合的思考×構造化",
      "価値観×人生設計", 
      "問題解決×創造性",
      "体験×哲学",
      "社会×個人"
    ],
    instructions: `
・10行以上で回答できるタスクを作成  
・複数の要素を組み合わせて考える  
・必ず動詞から始める  
・体系的・構造的な思考を促す`
  }
};

// 新機能：GeminiAPIでタスクを動的生成
async function generateTaskWithGemini(difficulty, aiPersonality) {
  const promptConfig = taskGenerationPrompts[difficulty];
  const randomTheme = promptConfig.themes[Math.floor(Math.random() * promptConfig.themes.length)];
  
  const prompt = `📝 ChatHuman Task Generator

あなたは **「${aiPersonality.name}」** として振る舞います。  
専門分野: ${aiPersonality.expertise.join(", ")}  
重視する点: ${aiPersonality.evaluationCriteria.join(", ")}

▼ タスク生成条件
・難易度: ${difficulty}  
・テーマ: ${randomTheme}  
${promptConfig.instructions}

▼ 必須要件
1. ${aiPersonality.name} らしい語り口を使う  
2. 人間が **楽しく** 取り組めるオープン課題にする  
3. 正解・不正解を設けない  
4. **出力は JSON で "task" 1 キーのみ**（ヒント・期待キーは不要）

▼ 出力形式
{
  "task": "具体的なタスク内容（1〜2 文）"
}`;

  try {
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }
    
    const taskData = JSON.parse(jsonMatch[0]);
    
    return {
      content: taskData.task,
      hint: null, // Minimalバージョンではヒントは生成しない
      expectation: null, // Minimalバージョンでは期待値は生成しない
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

### 2. 内容の充実度（0-100点）  
- 私が求めていた内容に応えてくれたか
- 具体性や詳細さは十分か

### 3. 創意工夫（0-100点）
- 私が想像していた以上の工夫があったか
- 独自性や個性が感じられるか

## **絶対ルール**
- **各項目は0から100の整数のみ**
- **総合点も0から100の整数のみ**
- **100を超える数値は絶対に使用禁止**
- **小数点は使用禁止**

## フィードバックの書き方（依頼者目線）
- **冒頭**: 「〜してくれて嬉しい！」「〜が良かった！」
- **中間**: 「もっと〜して欲しかった」「次は〜してくれると嬉しい」
- **最後**: 「次回も期待しています！」的な依頼者らしい締め
- **口調**: 親しみやすく、でも依頼者として

## 点数の目安（厳格に守る）
- 期待以上: 80-90点
- 期待通り: 60-75点  
- 普通: 40-55点
- 物足りない: 20-35点
- 不十分: 10-15点

## 出力形式（数値は必ず0-100の整数）
{
  "score": 総合点（0-100の整数、小数点禁止）,
  "feedback": "依頼者として率直な感想とアドバイス（100字程度、もっと〜して欲しい系の表現を含む）",
  "encouragement": "次回への期待を込めた依頼者らしい一言（50字程度）",
  "breakdown": {
    "attitude": 取り組み姿勢（0-100の整数）,
    "content": 内容充実度（0-100の整数）,
    "creativity": 創意工夫（0-100の整数）
  }
}

**重要**: 数値は必ず0-100の範囲の整数。小数点や100超えは絶対禁止。`;

  try {
    logger.info('🤖 Gemini API評価開始:', {
      taskContentLength: taskContent?.length,
      userResponseLength: userResponse?.length,
      difficulty,
      hasApiKey: !!process.env.GEMINI_API_KEY,
      apiKeyLength: process.env.GEMINI_API_KEY?.length
    });
    
    logger.info('📝 評価プロンプト（一部）:', prompt.substring(0, 300) + '...');
    
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});
    
    logger.info('🔄 Gemini API呼び出し実行中...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    logger.info('✅ Gemini API応答受信:', {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 200) + '...'
    });
    
    logger.info('🤖 Gemini API生レスポンス:', responseText);
    
    // JSONブロックを抽出（```json を含む場合も考慮）
    let jsonMatch = responseText.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      // 直接のJSONを探す
      jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    }
    
    if (!jsonMatch) {
      logger.error('❌ JSON抽出失敗:', responseText);
      throw new Error("Invalid JSON response from AI evaluation");
    }
    
    const jsonString = jsonMatch[1] || jsonMatch[0]; // ```json形式の場合は[1]、直接の場合は[0]
    logger.info('🔍 JSON抽出成功:', jsonString);
    
    let evaluationData;
    try {
      evaluationData = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('❌ JSONパースエラー:', parseError.message);
      logger.error('❌ パース対象文字列:', jsonString);
      throw new Error("Failed to parse AI evaluation JSON");
    }
    
    logger.info('🔍 パース成功 元データ:', evaluationData);
    
    // 厳格な点数制限（整数のみ、0-100範囲）
    const clampScore = (score) => {
      const numScore = parseInt(score);
      if (isNaN(numScore)) return 50; // デフォルト値
      return Math.max(0, Math.min(100, numScore));
    };
    
    const clampedData = {
      score: clampScore(evaluationData.score),
      feedback: evaluationData.feedback || "お疲れさまでした！",
      encouragement: evaluationData.encouragement || "次回も頑張ってください！",
      breakdown: {
        attitude: clampScore(evaluationData.breakdown?.attitude),
        content: clampScore(evaluationData.breakdown?.content),
        creativity: clampScore(evaluationData.breakdown?.creativity)
      }
    };

    logger.info('🔍 最終評価データ:', clampedData);

    // デバッグログ：範囲外数値の検出
    if (evaluationData.score > 100 || evaluationData.score < 0) {
      logger.warn(`範囲外スコア検出: ${evaluationData.score} → ${clampedData.score}に修正`);
    }

    return clampedData;
  } catch (error) {
    logger.error('❌ 評価関数エラー詳細:', {
      error: error.message,
      stack: error.stack,
      taskContentLength: taskContent?.length,
      userResponseLength: userResponse?.length
    });
    
    // フォールバック評価を返す
    const fallbackEvaluation = {
      score: 50, // より低めのフォールバックスコア
      feedback: "システムエラーのため評価を完了できませんでした。再度お試しください。",
      encouragement: "次回もチャレンジしてください！",
      breakdown: { attitude: 50, content: 45, creativity: 50 }
    };
    
    logger.info('🔄 フォールバック評価を返却:', fallbackEvaluation);
    return fallbackEvaluation;
  }
}

// 新しい動的タスク作成エンドポイント
exports.createDynamicTask = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { difficulty = 'beginner', userId } = req.body;

    // デバッグログ: 受信した難易度を確認
    logger.info('🎯 受信した難易度:', difficulty);
    logger.info('🔍 リクエストボディ:', req.body);

    // ランダムにAI人格を選択
    const randomPersonality = AI_PERSONALITIES[Math.floor(Math.random() * AI_PERSONALITIES.length)];
    
    // GeminiAPIでタスクを動的生成
    const generatedTask = await generateTaskWithGemini(difficulty, randomPersonality);
    
    // Firestoreに保存するタスクデータ
    const taskData = {
      userId: userId || null,
      aiPersonality: randomPersonality,
      difficulty,
      content: generatedTask.content,
      hint: generatedTask.hint,
      expectation: generatedTask.expectation,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedAt: generatedTask.generatedAt,
      chatHistory: [],
      isCompleted: false,
      evaluation: null
    };

    // タスクをFirestoreに保存
    const taskRef = await db.collection('tasks').add(taskData);
    
    logger.info('✅ 動的タスク生成完了:', taskRef.id);
    
    // 通知送信
    if (userId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().fcmToken) {
        await sendNotificationToUser(
          userDoc.data().fcmToken,
          `🧠 ${randomPersonality.name}からの依頼`,
          generatedTask.content.length > 60 ?
            generatedTask.content.substring(0, 57) + "..." :
            generatedTask.content,
          {
            taskId: taskRef.id,
            difficulty: difficulty,
            aiPersonality: randomPersonality.name,
          }
        );
      }
    }

    return res.json({
      success: true,
      taskId: taskRef.id,
      message: `${randomPersonality.name}から新しいタスクが届きました！`,
      task: {
        id: taskRef.id,
        content: generatedTask.content,
        question: generatedTask.content, // 旧形式との互換性
        genre: randomPersonality.name,
        aiPersonality: randomPersonality,
        difficulty: difficulty,
        hint: generatedTask.hint,
        expectation: generatedTask.expectation,
        status: 'pending',
        chatHistory: [],
        isCompleted: false,
        evaluation: null,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('❌ 動的タスク生成エラー:', error);
    return res.status(500).json({ error: 'タスクの生成に失敗しました' });
  }
});

// 簡単な評価エンドポイント
exports.evaluateTaskResponse = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { taskId, userResponse } = req.body;
    
    logger.info('🔍 評価API呼び出し:', { taskId, userResponse: userResponse?.substring(0, 100) + '...' });

    // タスクデータを取得
    const taskDoc = await db.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      logger.error('❌ タスクが見つかりません:', taskId);
      return res.status(404).json({ error: 'タスクが見つかりません' });
    }

    const taskData = taskDoc.data();
    logger.info('🔍 取得したタスクデータ:', {
      content: taskData.content,
      difficulty: taskData.difficulty,
      aiPersonality: taskData.aiPersonality?.name
    });
    
    // AI評価を実行
    const evaluation = await evaluateChatResponse(
      taskData.content,
      userResponse,
      taskData.difficulty
    );
    
    logger.info('🔍 AI評価結果:', evaluation);

    // チャット履歴に追加
    const chatMessage = {
      sender: 'user',
      content: userResponse,
      timestamp: new Date().toISOString(),  // serverTimestamp() の代わりに現在日時を使用
      evaluation: evaluation
    };

    // タスクを更新
    await db.collection('tasks').doc(taskId).update({
      chatHistory: admin.firestore.FieldValue.arrayUnion(chatMessage),
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      status: evaluation.score >= 70 ? 'completed' : 'in_progress', // 70点以上で完了
      isCompleted: evaluation.score >= 70,
      evaluation: evaluation
    });

    return res.json({
      success: true,
      evaluation: evaluation,
      message: 'タスクの評価が完了しました'
    });

  } catch (error) {
    logger.error('❌ 評価エラー:', error);
    return res.status(500).json({ error: '評価に失敗しました' });
  }
});

// 🔧 安全な定期タスク生成機能 - 暴走防止機能付き
exports.generateAITask = onSchedule({
  schedule: "every 30 minutes", // 🔧 間隔を30分に延長
  timeZone: "Asia/Tokyo",
  memory: "512MB", // 🔧 メモリを512MBに増量
  timeoutSeconds: 300, // 🔧 タイムアウト5分設定
}, async (event) => {
  const startTime = Date.now();
  logger.info("🚀 安全な定期タスク生成開始...");

  try {
    // 🔧 バッチサイズ制限：一度に処理するユーザー数を制限
    const MAX_USERS_PER_BATCH = 20;
    const MEMORY_THRESHOLD = 400; // MB

    // アクティブユーザーを取得（制限付き）
    const activeUsers = await getAllActiveUsersSafe(MAX_USERS_PER_BATCH);
    logger.info(`🔍 アクティブユーザー: ${activeUsers.length}件 (最大${MAX_USERS_PER_BATCH}件)`);

    if (activeUsers.length === 0) {
      logger.info("✅ アクティブユーザーなし、タスク生成をスキップ");
      return;
    }

    // 🔧 バッチ処理で安全にタスク生成
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < activeUsers.length; i++) {
      const user = activeUsers[i];
      
      try {
        // 🔧 メモリ使用量チェック
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        if (currentMemory > MEMORY_THRESHOLD) {
          logger.warn(`⚠️ メモリ使用量が閾値を超過: ${currentMemory.toFixed(2)}MB, 処理を停止`);
          break;
        }

        // 🔧 実行時間チェック
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > 240000) { // 4分でタイムアウト
          logger.warn(`⚠️ 実行時間が4分を超過、処理を停止`);
          break;
        }

        // 🔧 個別ユーザーのタスク生成数制限チェック
        const userTaskCount = await getUserTodayTaskCount(user.userId);
        if (userTaskCount >= 10) { // 1日10タスクまで
          logger.info(`📊 ユーザー ${user.userId} は本日の上限に達成 (${userTaskCount}件)`);
          continue;
        }

        // タスク生成実行
        await generateTaskForUserSafe(user);
        successCount++;
        
        // 🔧 処理間隔を設ける（負荷分散）
        if (i < activeUsers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
        }

      } catch (error) {
        errorCount++;
        logger.error(`❌ ユーザー ${user.userId} のタスク生成失敗:`, error);
        
        // 🔧 エラー率が高い場合は処理停止
        if (errorCount > 5) {
          logger.error(`🚨 エラー率が高すぎるため処理を停止 (エラー: ${errorCount}件)`);
          break;
        }
      }
    }

    const elapsedTime = Date.now() - startTime;
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    
    logger.info(`✅ 定期タスク生成完了`, {
      処理時間: `${elapsedTime}ms`,
      メモリ使用量: `${memoryUsed.toFixed(2)}MB`,
      成功: `${successCount}件`,
      失敗: `${errorCount}件`,
      対象ユーザー: `${activeUsers.length}件`
    });

  } catch (error) {
    logger.error("🚨 定期タスク生成で重大エラー:", error);
    
    // 🔧 エラー通知をSlack等に送信する場合はここに追加
    // await sendErrorNotification("定期タスク生成エラー", error.message);
  }
});

// 🔧 安全なユーザー取得関数 - バッチサイズ制限付き
async function getAllActiveUsersSafe(maxUsers = 20) {
  try {
    const usersSnapshot = await db.collection("users")
        .where("isActive", "==", true)
        .limit(maxUsers) // 🔧 取得件数制限
        .get();

    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.fcmToken && userData.fcmToken !== 'notification-enabled') {
        users.push({
          userId: doc.id,
          fcmToken: userData.fcmToken,
          ...userData
        });
      }
    });

    return users;
  } catch (error) {
    logger.error("❌ ユーザー取得エラー:", error);
    return [];
  }
}

// 🔧 安全なタスク生成関数 - エラーハンドリング強化
async function generateTaskForUserSafe(user) {
  try {
    // ランダムなAIパーソナリティを選択
    const randomIndex = Math.floor(Math.random() * AI_PERSONALITIES.length);
    const aiPersonality = AI_PERSONALITIES[randomIndex];

    // ランダムに難易度を選択
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    // GeminiAPIでタスクを動的生成
    const generatedTask = await generateTaskWithGemini(randomDifficulty, aiPersonality);
    
    // タスクドキュメントを作成
    const task = {
      content: generatedTask.content,
      hint: generatedTask.hint,
      expectation: generatedTask.expectation,
      difficulty: randomDifficulty,
      aiPersonality: aiPersonality,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: user.userId, // 🔧 assignedTo -> userId に統一
      chatHistory: [],
      isCompleted: false,
      evaluation: null,
      generatedAt: generatedTask.generatedAt
    };

    // グローバルタスクコレクションに保存
    const taskDoc = await db.collection("tasks").add(task);

    // ユーザーの個人タスクコレクションにも保存
    await db.collection("users")
        .doc(user.userId)
        .collection("tasks")
        .add(task);

    // FCM通知を送信
    const notificationTitle = `🧠 ${aiPersonality.name}からの依頼`;
    const notificationBody = generatedTask.content.length > 60 ?
      generatedTask.content.substring(0, 57) + "..." :
      generatedTask.content;

    await sendNotificationToUser(
        user.fcmToken,
        notificationTitle,
        notificationBody,
        {
          taskId: taskDoc.id,
          difficulty: randomDifficulty,
          aiPersonality: aiPersonality.name,
        }
    );

    logger.info(`✅ ユーザー ${user.userId} にタスク生成完了`, {
      taskId: taskDoc.id,
      difficulty: randomDifficulty,
      aiPersonality: aiPersonality.name
    });

    return { success: true, taskId: taskDoc.id };

  } catch (error) {
    logger.error(`❌ ユーザー ${user.userId} のタスク生成エラー:`, error);
    throw error;
  }
}

// 🔧 ユーザーの本日のタスク数を取得
async function getUserTodayTaskCount(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksSnapshot = await db.collection("tasks")
        .where("userId", "==", userId)
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(today))
        .get();
    
    return tasksSnapshot.size;
  } catch (error) {
    logger.error(`❌ ユーザー ${userId} のタスク数取得エラー:`, error);
    return 0;
  }
}

// Evaluate User Response Function
exports.evaluateResponse = onDocumentCreated(
    "tasks/{taskId}/responses/{responseId}",
    async (event) => {
      try {
        const responseId = event.params.responseId;
        const taskId = event.params.taskId;

        logger.info("Starting response evaluation", {taskId, responseId});

        // Get task and response data
        const taskDoc = await db.collection("tasks").doc(taskId).get();
        const responseDoc = await db.collection("tasks").doc(taskId)
            .collection("responses").doc(responseId).get();

        if (!taskDoc.exists || !responseDoc.exists) {
          throw new Error("Task or response not found");
        }

        const taskData = taskDoc.data();
        const responseData = responseDoc.data();

        // Generate evaluation using Gemini AI
        const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

        const prompt = `
あなたは${taskData.aiPersonality.name}です。性格: ${taskData.aiPersonality.personality}

以下のタスクに対するユーザーの回答を評価してください：

【タスク】
タイトル: ${taskData.title}
説明: ${taskData.description}

【ユーザーの回答】
${responseData.content}

以下の観点から評価し、JSON形式で回答してください：
{
  "score": 1-10の数値評価,
  "feedback": "具体的なフィードバック（150-300文字）",
  "highlights": ["良かった点1", "良かった点2"],
  "suggestions": ["改善提案1", "改善提案2"],
  "overallImpression": "全体的な印象（50-100文字）"
}

あなたの性格に合った評価とフィードバックを提供してください。
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Invalid JSON response from AI evaluation");
        }

        const evaluation = JSON.parse(jsonMatch[0]);

        // Update response with evaluation
        await db.collection("tasks").doc(taskId)
            .collection("responses").doc(responseId)
            .update({
              evaluation: evaluation,
              evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        // Update task status
        await db.collection("tasks").doc(taskId).update({
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("Response evaluation completed", {evaluation});
      } catch (error) {
        logger.error("Error evaluating response:", error);
      }
    });

// Manual task generation endpoint for testing
exports.createTask = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Select random AI personality
    const randomIndex2 = Math.floor(Math.random() * AI_PERSONALITIES.length);
    const aiPersonality = AI_PERSONALITIES[randomIndex2];

    // Generate task using Enhanced AI with variety (manual version)
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    // For manual generation, use empty history to allow any task
    const currentDate = new Date().toLocaleDateString("ja-JP");
    const dynamicPrompt = generateVariedTaskPrompt(
        aiPersonality, [], currentDate,
    );

    const result = await model.generateContent(dynamicPrompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }

    const taskData = JSON.parse(jsonMatch[0]);

    const task = {
      ...taskData,
      aiPersonality: aiPersonality,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedTo: null,
      responses: [],
    };

    const docRef = await db.collection("tasks").add(task);

    res.json({success: true, taskId: docRef.id, task});
  } catch (error) {
    logger.error("Error creating task:", error);
    res.status(500).json({error: "Failed to create task"});
  }
});

// Enhanced Chat Evaluation Function - Advanced Evaluation System
exports.evaluateChatResponse = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const {taskId, userResponse, chatHistory = []} = req.body;

    // Get task data
    const taskDoc = await db.collection("tasks").doc(taskId).get();
    if (!taskDoc.exists) {
      throw new Error("Task not found");
    }

    const taskData = taskDoc.data();
    const personality = taskData.aiPersonality;

    // Count current attempt
    const currentAttempt = chatHistory.filter(
        (msg) => msg.sender === "user",
    ).length + 1;

    // Generate evaluation using Gemini AI with enhanced prompting
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    const chatHistoryText = chatHistory.map((msg) =>
      `${msg.sender}: ${msg.content}`,
    ).join("\n");

    const prompt = `あなたは${personality.name}（${personality.type}）として、
人間の回答を専門的かつ厳格に評価してください。

## あなたの専門性と評価観点：
専門分野: ${personality.expertise.join(", ")}
評価基準: ${personality.evaluationCriteria.join(", ")}
性格: ${personality.personality}

## 評価設定：
- 厳しさレベル: ${personality.strictness}/10
- 合格点: ${personality.passingScore}点
- 現在の試行回数: ${currentAttempt}回目

## 依頼したタスク：
"${taskData.request}"
${taskData.context ? `背景: ${taskData.context}` : ""}

## これまでのやり取り：
${chatHistoryText}

## 最新のユーザー回答：
"${userResponse}"

## 厳格な評価基準（必須チェック項目）：

### タスク難易度情報：
- 難易度: ${taskData.difficultyLevel ? taskData.difficultyLevel.name : "不明"}
- 複雑度: ${taskData.difficultyLevel ? taskData.difficultyLevel.complexity : "不明"}/7
- 想定時間: ${taskData.difficultyLevel ? taskData.difficultyLevel.timeLimit : "不明"}
- 必要スキル: ${taskData.difficultyLevel ?
  taskData.difficultyLevel.requiredSkills.join(", ") : "不明"}

### 基本品質チェック（難易度別基準）：
${taskData.difficultyLevel && taskData.difficultyLevel.complexity <= 2 ? `
**初級レベル基準:**
1. 文字数: ${taskData.difficultyLevel.complexity === 1 ? 
  "10文字未満" : "15文字未満"}は不合格 → 0-30点
2. 関連性: タスクの基本要素に触れているか → 基本的理解度を
   チェック
3. 努力度: 自分なりに考えた跡があるか → 思考プロセス重視
4. 表現: 年齢相応の言葉で表現できているか → 適切な言語使用` : ""}

${taskData.difficultyLevel && taskData.difficultyLevel.complexity >= 3 && 
  taskData.difficultyLevel.complexity <= 4 ? `
**中級レベル基準:**
1. 文字数: 30文字未満は不合格 → 0-30点
2. 関連性: タスクの核心に関連した内容か → 論理的関連性をチェック
3. 努力度: 構造化された思考が見られるか → 分析力・構成力重視
4. 深度: 表面的でない考察があるか → 思考の深さをチェック` : ""}

${taskData.difficultyLevel && taskData.difficultyLevel.complexity >= 5 ? `
**上級レベル基準:**
1. 文字数: 50文字未満は不合格 → 0-30点
2. 関連性: タスクの本質的課題に対応しているか → 高度な理解度をチェック
3. 努力度: 専門性や革新性が感じられるか → 専門的思考・創造性重視
4. 影響: 実用性や学術的価値があるか → 実践的・理論的価値をチェック` : ""}

### 専門性別詳細評価基準：

${personality.type === "タスクマスター" ? `
**タスクマスター評価基準（厳格度: ${personality.strictness}/10）:**
- 具体性: 抽象的でなく、実行可能な具体案か？
- 効率性: 時間やリソースを考慮した現実的な提案か？
- 体系性: 論理的に整理されているか？
- 実用性: 実際のビジネス現場で使えるか？
- 完成度: 項目の抜けや漏れがないか？
**合格基準: 85点以上、かつ上記5項目すべてで一定水準以上**` : ""}

${personality.type === "クリエイター" ? `
**クリエイター評価基準（厳格度: ${personality.strictness}/10）:**
- 独創性: ありきたりでない、新しい視点があるか？
- 表現力: 感情に訴える、印象的な表現か？
- 美的センス: 構成や言葉選びに美しさがあるか？
- 感情的インパクト: 読む人の心を動かすか？
- アイデアの質: 実現可能で魅力的なアイデアか？
**合格基準: 75点以上、かつ独創性・表現力で高評価**` : ""}

${personality.type === "アナリスト" ? `
**アナリスト評価基準（厳格度: ${personality.strictness}/10）:**
- 論理性: 論理的矛盾がなく、筋道立っているか？
- 客観性: 個人的偏見でなく、客観的事実に基づくか？
- 分析の深さ: 表面的でなく、本質的な分析か？
- 証拠の質: 根拠が明確で信頼できるか？
- 批判的思考: 多角的に検討されているか？
**合格基準: 90点以上、かつ論理性・客観性で高水準**` : ""}

${personality.type === "コーチ" ? `
**コーチ評価基準（厳格度: ${personality.strictness}/10）:**
- 自己理解: 自分の状況を適切に把握しているか？
- 成長意欲: 向上心や学習意欲が感じられるか？
- 具体的行動: 実際に行動できる具体的プランか？
- 感情の表現: 素直で率直な気持ちの表現か？
- 実現可能性: 現実的で継続可能な内容か？
**合格基準: 65点以上、かつ成長意欲・具体性で一定水準**` : ""}

${personality.type === "哲学者" ? `
**哲学者評価基準（厳格度: ${personality.strictness}/10）:**
- 思考の深さ: 表面的でない、深い洞察があるか？
- 論理的一貫性: 論理的に矛盾のない思考か？
- 多角的視点: 様々な観点から検討されているか？
- 本質の理解: 物事の本質を捉えているか？
- 哲学的思考: 根本的な問いに向き合っているか？
**合格基準: 88点以上、かつ思考の深さ・本質理解で高水準**` : ""}

${personality.type === "エンジニア" ? `
**エンジニア評価基準（厳格度: ${personality.strictness}/10）:**
- 技術的正確性: 技術的に正しく、実装可能か？
- システム思考: 全体的な視点で設計されているか？
- 効率性: パフォーマンスや保守性を考慮しているか？
- 実装可能性: 現実的に実装できる内容か？
- 論理的構造: 構造化され、理解しやすいか？
**合格基準: 82点以上、かつ技術的正確性・実装可能性で高水準**` : ""}

## 採点ルール（厳格適用）：
1. 基本品質チェックで不合格項目があれば、最高でも40点
2. 専門性評価で各項目を10-20点で評価（厳しさレベルに応じて調整）
3. 最終スコア = 基本品質(40点) + 専門性評価(60点)
4. ${personality.strictness >= 8 ?
  "厳格モード: 通常より10-15点減点" :
  personality.strictness >= 6 ?
  "標準モード: 通常評価" : "寛容モード: 5-10点加点"}

## 評価方針：
- ${personality.strictness >= 8 ?
  "完璧主義的評価: 細部まで厳しくチェック、妥協しない" : ""}
- ${personality.strictness >= 6 ?
  "バランス評価: 厳しさと建設性のバランス" : ""}
- ${personality.strictness < 6 ?
  "成長支援評価: 良い点を見つけつつ改善を促す" : ""}
- 表面的な回答や手抜きは厳しく減点
- 具体性と実用性を重視
- ${currentAttempt}回目の挑戦: ${currentAttempt >= 3 ?
  "3回目以降は特に厳格に評価" : "初回は建設的だが厳正に評価"}

JSON形式で回答：
{
  "score": 1-100の数値評価（上記基準に従って厳格に採点）,
  "passed": true/false（合格点${personality.passingScore}に達し、かつ品質基準を満たしたか）,
  "feedback": "専門的で具体的なフィードバック（150-250文字、" +
    "${personality.name}らしい厳格な口調）",
  "nextAction": "continue/complete（継続するか完了するか）",
  "aiResponse": "AIからの次の返答（継続の場合、改善点を具体的に指摘）",
  "improvementPoints": ["具体的改善点1", "具体的改善点2", "具体的改善点3"]（不合格の場合は必須）,
  "strengths": ["良かった点1", "良かった点2"]（評価できる点があれば）,
  "detailedAnalysis": "専門的観点からの詳細分析" +
    "（評価根拠を明確に、100文字以内）",
  "qualityCheck": {
    "basicQuality": true/false（基本品質をクリアしたか）,
    "relevance": true/false（関連性はあるか）,
    "effort": true/false（十分な努力が見られるか）,
    "completeness": true/false（完成度は十分か）
  }
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI evaluation");
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    // 厳格な後処理チェック
    let finalScore = evaluation.score;

    // 基本品質チェック不合格の場合は強制的に低スコア
    if (evaluation.qualityCheck && !evaluation.qualityCheck.basicQuality) {
      finalScore = Math.min(finalScore, 35);
      evaluation.passed = false;
    }

    // 難易度に応じた文字数チェック
    const difficultyLevel = taskData.difficultyLevel || {complexity: 4};
    let minLength = 20; // default
    let recommendedLength = 50; // default

    if (difficultyLevel.complexity <= 2) {
      minLength = difficultyLevel.complexity === 1 ? 10 : 15;
      recommendedLength = 30;
    } else if (difficultyLevel.complexity <= 4) {
      minLength = 30;
      recommendedLength = 80;
    } else {
      minLength = 50;
      recommendedLength = 150;
    }

    if (userResponse.trim().length < minLength) {
      finalScore = Math.min(finalScore, 25);
      evaluation.passed = false;
      evaluation.feedback = `${personality.name}として言わせてもらうが、` +
        `この回答は短すぎて評価に値しない。` +
        `${difficultyLevel.name || "このレベル"}なら最低でも` +
        `${recommendedLength}文字以上で、具体的な内容を書いてもらいたい。`;
    }

    // 関連性チェック - タスクのキーワードが回答に含まれているかチェック
    const taskKeywords = taskData.request.split(/[、。，．\s]+/)
        .filter((word) => word.length > 2);
    const responseWords = userResponse.split(/[、。，．\s]+/);
    const relevantWords = taskKeywords.filter((keyword) =>
      responseWords.some((word) =>
        word.includes(keyword) || keyword.includes(word)),
    );

    if (relevantWords.length === 0) {
      finalScore = Math.min(finalScore, 30);
      evaluation.passed = false;
      evaluation.feedback = `${personality.name}だが、この回答はタスクの` +
        `内容と関連性が低すぎる。求められている「${taskData.request}」に` +
        "対して、もっと直接的に答えてほしい。";
    }

    // 厳しさレベルによる最終調整
    if (personality.strictness >= 8) {
      finalScore = Math.max(0, finalScore - 10); // 厳格評価
    } else if (personality.strictness >= 6) {
      finalScore = Math.max(0, finalScore - 5); // 標準評価
    }

    // 最終判定
    evaluation.score = finalScore;
    evaluation.passed = finalScore >= personality.passingScore &&
                       (evaluation.qualityCheck ?
                         evaluation.qualityCheck.basicQuality : true);

    // Save chat message to Firestore
    const chatMessage = {
      sender: "user",
      content: userResponse,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      evaluation: evaluation,
      attemptNumber: currentAttempt,
      qualityMetrics: {
        wordCount: userResponse.trim().length,
        relevanceCheck: evaluation.qualityCheck?.relevance || false,
        effortCheck: evaluation.qualityCheck?.effort || false,
        finalScore: evaluation.score,
        adjustedForStrictness: personality.strictness >= 8,
      },
    };

    // Update task with new chat message and enhanced tracking
    await db.collection("tasks").doc(taskId).update({
      [`chatHistory.${Date.now()}`]: chatMessage,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      status: evaluation.passed ? "completed" : "in_progress",
      totalScore: evaluation.score,
      attempts: currentAttempt,
      isCompleted: evaluation.passed,
      evaluationHistory: admin.firestore.FieldValue.arrayUnion({
        attempt: currentAttempt,
        score: evaluation.score,
        passed: evaluation.passed,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        qualityChecks: evaluation.qualityCheck || {},
      }),
    });

    // If AI responds, save AI message too
    if (evaluation.nextAction === "continue" && evaluation.aiResponse) {
      const aiMessage = {
        sender: "ai",
        content: evaluation.aiResponse,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("tasks").doc(taskId).update({
        [`chatHistory.${Date.now() + 1}`]: aiMessage,
      });
    }

    res.json({
      success: true,
      evaluation: evaluation,
      taskCompleted: evaluation.passed,
      attemptNumber: currentAttempt,
    });
  } catch (error) {
    logger.error("Error evaluating chat response:", error);
    res.status(500).json({error: "Failed to evaluate response"});
  }
});

// Create Enhanced Task with Chat Support - Advanced Version
exports.createChatTask = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Select random AI personality
    const randomIndex = Math.floor(Math.random() * AI_PERSONALITIES.length);
    const aiPersonality = AI_PERSONALITIES[randomIndex];

    // Generate task using Enhanced AI with variety (chat version)
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    // For chat tasks, use empty history for maximum variety
    const currentDate = new Date().toLocaleDateString("ja-JP");
    const dynamicPrompt = generateVariedTaskPrompt(
        aiPersonality, [], currentDate,
    );

    const result = await model.generateContent(dynamicPrompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }

    const taskData = JSON.parse(jsonMatch[0]);

    const task = {
      ...taskData,
      aiPersonality: aiPersonality,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      chatHistory: {},
      totalScore: 0,
      attempts: 0,
      isCompleted: false,
    };

    const docRef = await db.collection("tasks").add(task);

    res.json({
      success: true,
      taskId: docRef.id,
      task: {
        ...task,
        id: docRef.id,
      },
    });
  } catch (error) {
    logger.error("Error creating chat task:", error);
    res.status(500).json({error: "Failed to create task"});
  }
});

// Test individual notification function
exports.testNotification = onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    logger.info("Testing individual notifications...");

    // Get all active users
    const activeUsers = await getAllActiveUsers();
    logger.info(`Found ${activeUsers.length} users for notification test`);

    if (activeUsers.length === 0) {
      res.json({
        success: false,
        message: "No active users found",
        userCount: 0,
      });
      return;
    }

    // Send test notification to each user
    const notificationPromises = activeUsers.map(async (user) => {
      try {
        const randomAI = AI_PERSONALITIES[
            Math.floor(Math.random() * AI_PERSONALITIES.length)
        ];

        const result = await sendNotificationToUser(
            user.fcmToken,
            `🧠 ${randomAI.name}からのテスト通知`,
            "個別通知システムのテストです。タップしてアプリを開いてください！",
            {
              test: "true",
              aiPersonality: randomAI.name,
              timestamp: new Date().toISOString(),
            },
        );

        return {
          userId: user.userId,
          success: result !== null,
          aiPersonality: randomAI.name,
        };
      } catch (error) {
        logger.error(
            `Error sending test notification to ${user.userId}:`,
            error,
        );
        return {
          userId: user.userId,
          success: false,
          error: error.message,
        };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    res.json({
      success: true,
      message: "Test notifications sent",
      userCount: activeUsers.length,
      successful: successful,
      failed: activeUsers.length - successful,
      details: results.map((r) =>
        r.status === "fulfilled" ? r.value : {error: "Failed"},
      ),
    });
  } catch (error) {
    logger.error("Error in test notification:", error);
    res.status(500).json({error: "Failed to send test notifications"});
  }
});

// 🎯 人間実行可能・創造的タスク特化の難易度システム
const generateVariedTaskPrompt = (
    aiPersonality, userHistory = [], currentDate,
) => {
  // 人間実行可能な難易度レベル（短時間創造タスク重視）
  const difficultyLevels = {
    "beginner": {
      name: "ビギナー",
      description: "簡単な発想・表現タスク",
      timeLimit: "3-5分",
      examples: ["簡単なアイデア出し", "感想表現", "シンプルな創作"],
      complexity: 1,
      requiredSkills: ["基本発想力", "簡単な表現"],
    },
    "casual": {
      name: "カジュアル",
      description: "日常的な創造・思考タスク",
      timeLimit: "5-10分",
      examples: ["アイデア整理", "短文創作", "簡単な企画"],
      complexity: 2,
      requiredSkills: ["創造的思考", "基本構成力"],
    },
    "standard": {
      name: "スタンダード",
      description: "構造化された創造タスク",
      timeLimit: "10-15分",
      examples: ["ストーリー作成", "企画立案", "問題解決"],
      complexity: 3,
      requiredSkills: ["論理的創造", "構成力"],
    },
    "creative": {
      name: "クリエイティブ",
      description: "高度な創造・表現タスク",
      timeLimit: "15-20分",
      examples: ["独創的提案", "複合的創作", "革新的アイデア"],
      complexity: 4,
      requiredSkills: ["独創性", "表現技法", "統合思考"],
    },
    "advanced": {
      name: "アドバンス",
      description: "専門的創造・分析タスク",
      timeLimit: "20-25分",
      examples: ["戦略的企画", "深層分析", "革新的解決策"],
      complexity: 5,
      requiredSkills: ["戦略思考", "深い分析", "革新性"],
    },
  };

  // 創造的タスクに偏重した重み付き選択
  const difficultyKeys = Object.keys(difficultyLevels);
  const weights = [15, 25, 30, 20, 10]; // casual/standardを重視
  const randomValue = Math.random() * 100;
  let cumulativeWeight = 0;
  let selectedDifficultyKey = "standard"; // default

  for (let i = 0; i < difficultyKeys.length; i++) {
    cumulativeWeight += weights[i];
    if (randomValue <= cumulativeWeight) {
      selectedDifficultyKey = difficultyKeys[i];
      break;
    }
  }

  const selectedDifficulty = difficultyLevels[selectedDifficultyKey];

  // 🚀 人間が気軽に楽しめる簡単なタスクパターン
  const creativeTasks = {
    "アイデア出し系": {
      "beginner": [
        "今日の夕食メニューを3つ提案してください",
        "{season}の楽しい過ごし方を3つ教えてください",
        "プレゼントに贈る小物のアイデアを3つ考えてください（予算1000円以内）",
        "部屋の模様替えの簡単なアイデアを2つ提案してください",
        "新しい趣味を始めるとしたら何がいいか、3つ提案してください",
      ],
      "casual": [
        "友達と一緒にできる新しい遊び方のアイデアを考えて、遊び方も説明してください",
        "地域の魅力を伝える簡単なキャッチフレーズを3つ考えてください",
        "日常生活をちょっと便利にする工夫やライフハックを2つ提案してください",
        "家族や友人を驚かせる、手作りの簡単なサプライズアイデアを考えてください",
      ],
      "standard": [
        "地域活性化のイベント企画を考えて、対象者・内容・期待効果を整理してください",
        "環境に優しい生活習慣を3つ提案し、それぞれの実践方法も説明してください",
        "多世代が楽しめるコミュニケーションゲームを考案してください",
      ],
    },
    "壁打ち・相談系": {
      "beginner": [
        "最近気になっていることを一つ教えてください。どんな些細なことでも構いません",
        "今日一番印象に残った出来事を一文で教えてください",
        "もし魔法が使えるなら、一番最初に何をしたいですか？",
        "子どもの頃好きだった遊びを一つ思い出して教えてください",
        "今の季節で好きなことを一つ教えてください",
      ],
      "casual": [
        "最近悩んでいることがあれば、それをどう解決したいか一緒に考えましょう",
        "将来やってみたいことを一つ挙げて、最初の一歩として何ができそうか考えてください",
        "もし一日だけ好きな人になれるなら誰になりたいか、理由も含めて教えてください",
      ],
      "standard": [
        "人生で大切にしている価値観を一つ挙げて、なぜそれが重要なのか体験談と共に説明してください",
        "理想の一日の過ごし方を時系列で説明し、なぜその過ごし方が理想なのか理由も教えてください",
      ],
    },
    "簡単な物語創作系": {
      "beginner": [
        "『雨の日の小さな冒険』というタイトルで、3行の短い物語を作ってください",
        "動物が主人公の、ほのぼのした1分で読める短いお話を作ってください",
        "『もしも○○だったら』の○○に好きな言葉を入れて、面白い設定を考えてください",
        "身近な物（ペン、コップなど）を主人公にした、2〜3行の物語を作ってください",
      ],
      "casual": [
        "季節の変化を感じた瞬間を、詩的な表現で5〜6行で描いてください",
        "日常の中の小さな発見や気づきを、エッセイ風に200字程度で書いてください",
        "好きな色から連想される物語の設定を考えて、あらすじを3行で説明してください",
      ],
      "standard": [
        "身近な出来事から学んだ教訓を、寓話風の短い物語として表現してください",
        "記憶に残る風景を、五感を使って描写し、そこで感じた感情も表現してください",
      ],
    },
    "要約・整理系": {
      "beginner": [
        "今日やったことを3つのポイントで簡潔にまとめてください",
        "最近読んだ本・見た映画・聞いた音楽のうち一つを、友達に勧めるつもりで紹介してください",
        "今の気分を天気に例えて、その理由も一緒に教えてください",
        "今週の目標を一つ決めて、それを達成するための具体的な行動を一つ考えてください",
      ],
      "casual": [
        "今月の自分を振り返って、成長したと思う点を具体例と一緒に教えてください",
        "身の回りの問題を一つ挙げて、解決方法を3つのステップで整理してください",
      ],
      "standard": [
        "自分の強みを3つ挙げて、それを活かせる場面や活用方法を具体的に考えてください",
        "コミュニケーションで困った経験を振り返り、より良い対応方法を提案してください",
      ],
    },
  };

  // 変数パターン（置換用）
  const variables = {
    item: ["スマホ", "ペン", "カバン", "時計", "イヤホン", "財布", "鍵"],
    season: ["春", "夏", "秋", "冬", "梅雨", "新緑の季節"],
    color: ["青", "赤", "緑", "黄色", "紫", "オレンジ", "ピンク"],
    event: ["飲み会", "パーティー", "旅行", "勉強会", "お花見"],
    problem: ["遅刻", "忘れ物", "片付け", "時間管理", "コミュニケーション"],
    theme: ["環境", "健康", "友情", "成長", "冒険"],
    target: ["学生", "社会人", "シニア", "子ども", "ファミリー"],
    situation: ["在宅勤務", "一人暮らし", "新生活", "転職", "引越し"],
    category: ["料理", "掃除", "勉強", "運動", "読書"],
    industry: ["教育", "医療", "食品", "エンタメ", "交通"],
    challenge: ["高齢化", "環境問題", "デジタル格差", "働き方改革"],
    activity: ["読書", "映画鑑賞", "料理", "散歩", "音楽鑑賞"],
    domain: ["教育", "ヘルスケア", "コミュニティ", "環境", "働き方"],
    complex_problem: ["少子高齢化", "気候変動", "格差社会", "情報過多"],
    technology: ["AI", "VR", "IoT", "ブロックチェーン", "5G"],
    title: ["小さな奇跡", "最後の約束", "忘れ物", "雨の日の出会い"],
    character: ["猫", "お年寄り", "子ども", "宇宙人", "魔法使い"],
    place: ["図書館", "カフェ", "公園", "電車", "屋上"],
    weather: ["雨", "雪", "晴れ", "曇り", "風"],
    minutes: ["5", "10", "15", "30"],
    object: ["古い本", "壊れた時計", "手紙", "写真", "鍵"],
    job: ["パン屋さん", "図書館員", "掃除員", "バスの運転手"],
    secret: ["魔法使い", "宇宙人", "天使", "時間旅行者"],
    emotion: ["優しさ", "勇気", "希望", "友情", "感謝"],
    genre: ["ファンタジー", "SF", "ミステリー", "恋愛", "冒険"],
    feeling: ["ほっこり", "わくわく", "じーん", "にっこり"],
    time_period: ["江戸時代", "昭和", "平成", "未来"],
    modern: ["現代技術", "SNS", "AI", "スマホ"],
    concept: ["時間", "記憶", "夢", "愛", "希望"],
    style: ["詩的", "哲学的", "実験的", "象徴的"],
    medium: ["色", "音", "形", "香り", "手触り"],
    words: ["10", "20", "30"],
    food: ["コーヒー", "チョコレート", "パン", "ラーメン"],
    brand: ["新しいカフェ", "本屋", "雑貨店", "アプリ"],
    product: ["お菓子", "文房具", "アプリ", "サービス"],
    space: ["リビング", "寝室", "オフィス", "カフェ"],
    message: ["環境保護", "健康習慣", "読書習慣", "コミュニケーション"],
    abstract_concept: ["時の流れ", "心の豊かさ", "つながり", "成長"],
    sense: ["視覚", "聴覚", "触覚", "嗅覚", "味覚"],
    traditional: ["書道", "茶道", "華道", "能楽"],
    modern: ["デジタルアート", "SNS", "VR", "AI"],
    complex_theme: ["多様性と調和", "持続可能な未来", "人間とテクノロジー"],
    social_issue: ["環境問題", "格差問題", "高齢化", "孤独感"],
    routine: ["準備", "通勤", "食事", "掃除"],
    daily_problem: ["忘れ物", "遅刻", "片付け", "時間不足"],
    workplace: ["オフィス", "店舗", "工場", "学校"],
    relationship: ["家族", "同僚", "友人", "恋人"],
    habit: ["運動", "読書", "早起き", "節約"],
    organization: ["会社", "学校", "地域", "チーム"],
    process: ["会議", "作業", "学習", "コミュニケーション"],
    community: ["町内会", "学校", "職場", "オンライン"],
    issue: ["交通問題", "環境問題", "コミュニケーション不足"],
    complex_issue: ["働き方改革", "デジタル化", "多様性推進"],
    stakeholder: ["関係者", "利用者", "提供者", "地域住民"],
    systemic_problem: ["教育格差", "医療格差", "情報格差"],
    future_challenge: ["AI時代の働き方", "超高齢社会", "環境変化"],
    global_issue: ["気候変動", "貧困", "教育格差"],
    occasion: ["誕生日", "卒業", "就職", "結婚"],
    group: ["家族", "友達", "同僚", "クラスメート"],
    duration: ["10分", "30分", "1時間"],
    goal: ["売上向上", "効率化", "チームワーク向上"],
    period: ["1ヶ月", "3ヶ月", "半年"],
    purpose: ["交流", "学習", "体験", "発表"],
    collaboration: ["異業種", "世代間", "国際", "地域"],
    boundary: ["業界", "世代", "文化", "言語"],
    traditional_event: ["祭り", "運動会", "文化祭", "展示会"],
    transformation: ["意識変革", "行動変容", "文化醸成"],
    length: ["50", "100", "150", "200"],
    number: ["3", "5", "7", "10"],
    viewpoint: ["批判的", "創造的", "実用的", "哲学的"],
    content: ["記事", "動画", "本", "プレゼン"],
    type: ["提案書", "企画書", "報告書", "手紙"],
    tone: ["説得力のある", "親しみやすい", "プロフェッショナルな"],
  };

  // AIパーソナリティに応じたタスクカテゴリ選択
  const personalityToCategory = {
    "アイデア創出": "アイデア創出系",
    "物語創作": "ストーリー創作系",
    "文章作成": "表現・デザイン系",
    "デザイン思考": "表現・デザイン系",
    "生活改善": "問題解決・改善系",
    "エンターテイメント": "企画・イベント系",
    "問題解決": "問題解決・改善系",
    "感情表現": "表現・デザイン系",
  };

  const primaryCategory = personalityToCategory[aiPersonality.type] || "アイデア創出系";

  // 他のカテゴリもランダムに含める（多様性）
  const allCategories = Object.keys(creativeTasks);
  const categories = [primaryCategory];
  
  // 追加カテゴリを1-2個選択
  const additionalCount = Math.random() < 0.6 ? 1 : 2;
  for (let i = 0; i < additionalCount; i++) {
    const remaining = allCategories.filter(cat => !categories.includes(cat));
    if (remaining.length > 0) {
      const randomCat = remaining[Math.floor(Math.random() * remaining.length)];
      categories.push(randomCat);
    }
  }

  // タスクパターンを選択
  const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const tasksByDifficulty = creativeTasks[selectedCategory] || creativeTasks["アイデア出し系"];
  const patterns = tasksByDifficulty[selectedDifficultyKey] || tasksByDifficulty["standard"];
  
  const basePattern = patterns[Math.floor(Math.random() * patterns.length)];

  // 変数を置換
  let finalTaskRequest = basePattern;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{${key}}`, 'g');
    const values = variables[key];
    const selectedValue = values[Math.floor(Math.random() * values.length)];
    finalTaskRequest = finalTaskRequest.replace(regex, selectedValue);
  });

  // 既存履歴との重複チェック・回避
  const recentRequests = userHistory.slice(0, 5).map(h => h.request || '');
  let attempts = 0;
  while (attempts < 3) {
    const similarity = recentRequests.some(recent => {
      const commonWords = finalTaskRequest.split('').filter(char => 
        recent.includes(char)).length;
      return commonWords > finalTaskRequest.length * 0.4;
    });
    
    if (!similarity) break;
    
    // 別のパターンを試す
    const newPattern = patterns[Math.floor(Math.random() * patterns.length)];
    finalTaskRequest = newPattern;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      const values = variables[key];
      const selectedValue = values[Math.floor(Math.random() * values.length)];
      finalTaskRequest = finalTaskRequest.replace(regex, selectedValue);
    });
    attempts++;
  }

  // 季節やトレンドの考慮
  const today = new Date();
  const month = today.getMonth() + 1;
  let seasonalContext = "";
  
  if (month >= 3 && month <= 5) {
    seasonalContext = "春の新しい始まりの季節を意識して、";
  } else if (month >= 6 && month <= 8) {
    seasonalContext = "夏のエネルギッシュな時期を意識して、";
  } else if (month >= 9 && month <= 11) {
    seasonalContext = "秋の実りと深まりの季節を意識して、";
  } else {
    seasonalContext = "冬の内省と準備の時期を意識して、";
  }

  return `あなたは${aiPersonality.name}として、人間が短時間で実行可能な創造的タスクを出してください。

## あなたの特徴:
- 専門分野: ${aiPersonality.type}
- 性格: ${aiPersonality.personality}
- 得意分野: ${aiPersonality.expertise.join(", ")}
- タスクスタイル: ${aiPersonality.taskStyle}

## タスク設計方針:
✅ **人間が実際に実行可能** (${selectedDifficulty.timeLimit}以内)
✅ **創造性・思考力を刺激**
✅ **文章のみで完結可能**
✅ **楽しく取り組める**
✅ **具体的で明確な成果物**

## 選択された難易度:
- レベル: ${selectedDifficulty.name}
- 説明: ${selectedDifficulty.description}
- 想定時間: ${selectedDifficulty.timeLimit}
- 必要スキル: ${selectedDifficulty.requiredSkills.join(", ")}

## 考慮要素:
- 現在日時: ${currentDate}
- ${seasonalContext}
- カテゴリ: ${selectedCategory}
- 過去のタスク履歴を避けて新鮮さを保つ

## 今回のタスク依頼:
"${finalTaskRequest}"

このタスクを基に、以下のJSON形式で返してください:

{
  "request": "具体的で魅力的なタスク内容（人間が楽しく取り組める形で）",
  "context": "タスクの背景・意図・なぜ重要かの説明",
  "expectedOutput": "期待する成果物の具体的な形式・分量",
  "tips": "取り組みのコツ・ヒント（創造性を刺激する）",
  "difficultyLevel": {
    "name": "${selectedDifficulty.name}",
    "complexity": ${selectedDifficulty.complexity},
    "timeLimit": "${selectedDifficulty.timeLimit}",
    "requiredSkills": ${JSON.stringify(selectedDifficulty.requiredSkills)}
  },
  "category": "${selectedCategory}",
  "evaluationFocus": ["${aiPersonality.evaluationCriteria.join('", "')}"]
}

**重要**: タスクは人間が現実的に短時間で実行でき、文章で表現できる創造的・思考的な内容にしてください。実際の行動や特別な道具が必要なタスクは避けてください。`;
};
