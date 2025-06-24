# Gemiyou アプリ 無限ループ・暴走事故 原因調査報告書

**作成日時:** 2025-06-21 23:45  
**対象システム:** Gemiyou（旧Chatヒューマン）  
**事故期間:** 2025-06-21 午後（約2-3時間継続）  
**緊急対応完了:** 2025-06-21 14:42（ユーザー確認：停止）

## 1. 事故概要

### 発生した現象
- **フロントエンド:** 画面が高速で切り替わる無限ループ
- **Cloud Functions:** メモリ不足による強制終了（OOM Kill）
- **Firestore:** 大量のユーザー・タスクデータが自動生成される暴走

### 影響範囲
- 全ユーザーのアプリ利用不可
- Cloud Functions実行回数・コスト増大
- Firestoreの読み書き上限に近づく可能性

## 2. 根本原因分析

### 2.1 Cloud Functions暴走の原因

**Cloud Functions ログより:**
```
2025-06-21T14:38:13 generateaitask: Out of Memory (OOM)
Signal: 6, pid=1, tid=1, fault_addr=0
Container terminated on signal 6
```

**問題のコード（/functions/index.js）:**
```javascript
// ❌ 危険な定期実行設定
exports.generateAITask = functions.pubsub.schedule('every 1 minutes')
  .timeZone('Asia/Tokyo')
  .onRun(async (context) => {
    const users = await getAllActiveUsers(); // 全アクティブユーザー取得
    
    for (const user of users) {
      // 各ユーザーに対してタスク生成 → 大量データ作成
      await generateTaskForUser(user);
    }
  });
```

**原因:**
1. **1分間隔でCloud Functions実行** → 短すぎる間隔で大量処理
2. **全アクティブユーザーを一度に処理** → メモリ使用量が爆発的に増加
3. **エラーハンドリング不足** → 失敗時のリトライで更に負荷増大

### 2.2 フロントエンド無限ループの原因

**App.tsx における useEffect の問題:**

```typescript
// ❌ 問題のuseEffect
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setUser(user);
    if (!user) {
      // 匿名ユーザー自動生成
      await signInAnonymously(auth); // ←これが新しいユーザー作成
    } else {
      await firestoreService.registerUser(user.uid); // ←Firestore書き込み
      loadUserData(user.uid); // ←これが再度認証状態変化をトリガー
    }
  });
}, []); // 依存配列は空

const loadUserData = useCallback(async (userId: string) => {
  // Firestoreからデータ読み込み → useEffect再実行のトリガー
  const tasks = await firestoreService.getUserTasks(userId, 20);
  setTasks(tasks); // ←状態更新
  
  const stats = await firestoreService.getUserStats(userId);
  setUserStats(stats); // ←状態更新
}, [saveToLocalStorage, loadFromLocalStorage, userStats]); // userStatsが依存配列に！
```

**ループの流れ:**
1. `onAuthStateChanged` でユーザー状態変化検知
2. `signInAnonymously` で新しい匿名ユーザー作成
3. `registerUser` でFirestoreにユーザー登録
4. `loadUserData` 実行でFirestoreからデータ取得
5. `setUserStats` で状態更新
6. `loadUserData`の依存配列に`userStats`があるため、コールバック再生成
7. 再度`loadUserData`実行 → **1に戻る（無限ループ）**

### 2.3 Firestore セキュリティルールの問題

**当時のfirestore.rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全ユーザーが読み書き可能（危険）
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**問題点:**
- 認証済みユーザーなら**無制限**で読み書き可能
- 大量データ作成を防ぐ制限なし
- レート制限・バリデーション不足

## 3. 実施した緊急対応

### 3.1 Cloud Functions停止（14:42完了）
```bash
# 定期実行タスクをコメントアウトしてデプロイ
firebase deploy --only functions

# 関数自体を強制削除
firebase functions:delete generateAITask --region us-central1 --force
```

### 3.2 Firestore書き込み完全停止（即時）
```javascript
// firestore.rules - 緊急変更
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // ←全書き込みを強制禁止
    }
  }
}
```

### 3.3 フロントエンド緊急停止（即時）
```typescript
// App.tsx - 危険コードをコメントアウト
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setUser(user);
    if (!user) {
      // 緊急停止：匿名ログイン試行を無効化
      console.log('🚨 緊急停止：新しいユーザー作成を無効化');
      // ❌ await signInAnonymously(auth);
    } else {
      // ❌ await firestoreService.registerUser(user.uid);
      // ❌ loadUserData(user.uid);
    }
  });
}, []);
```

### 3.4 全サービス緊急デプロイ
```bash
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

## 4. 技術的な問題詳細

### 4.1 useEffect依存配列の問題

**問題のコード:**
```typescript
const loadUserData = useCallback(async (userId: string) => {
  // ...処理...
  setUserStats(newStats); // userStats更新
}, [saveToLocalStorage, loadFromLocalStorage, userStats]); // ←userStatsが依存配列
```

**なぜ無限ループになったか:**
1. `loadUserData`実行 → `setUserStats`でuserStats更新
2. userStatsが変わったため、useCallback再実行でloadUserData関数も再生成
3. 関数の再生成により、useEffectが再実行判定
4. 再度`loadUserData`実行 → 1に戻る

**正しい修正案:**
```typescript
const loadUserData = useCallback(async (userId: string) => {
  // ...処理...
  setUserStats(newStats);
}, [saveToLocalStorage, loadFromLocalStorage]); // userStatsを除去
```

### 4.2 Cloud Functions メモリ管理

**問題:**
- 256MB メモリで全ユーザー処理は限界
- バッチ処理の概念がない
- エラー時のガベージコレクション不足

**改善案:**
```javascript
// バッチ処理で少しずつ実行
exports.generateAITask = functions.pubsub.schedule('every 5 minutes')
  .timeZone('Asia/Tokyo')
  .memory('512MB') // メモリ増量
  .onRun(async (context) => {
    const BATCH_SIZE = 10; // 一度に10ユーザーまで
    const users = await getActiveUsersBatch(BATCH_SIZE);
    
    for (const user of users) {
      try {
        await generateTaskForUser(user);
      } catch (error) {
        console.error(`User ${user.uid} task generation failed:`, error);
        // 個別エラーで全体を止めない
      }
    }
  });
```

## 5. 事故の被害状況

### 5.1 Cloud Functions使用量
- **generateAITask実行回数:** 推定100-200回（1分間隔×2-3時間）
- **OOMによる強制終了:** 多数発生
- **メモリ使用量:** 256MB上限に頻繁に到達

### 5.2 Firestore使用量
- **作成されたユーザー数:** 推定50-100件（テストユーザー）
- **作成されたタスク数:** 推定200-500件
- **読み取り・書き込み回数:** 大幅増加

### 5.3 フロントエンド影響
- **画面遷移速度:** 数秒〜数十秒間隔で高速切り替え
- **ユーザビリティ:** 完全に利用不可
- **ブラウザ負荷:** 高CPU使用率

## 6. 今後の対策・予防策

### 6.1 即座に実装すべき対策

**1. Cloud Functions改善**
```javascript
// 安全な定期実行設定
exports.generateAITask = functions.pubsub.schedule('every 30 minutes') // 間隔延長
  .memory('512MB') // メモリ増量
  .timeout(300) // タイムアウト設定
  .onRun(async (context) => {
    const MAX_USERS = 20; // 最大処理ユーザー数制限
    // バッチ処理とエラーハンドリング強化
  });
```

**2. Firestore セキュリティルール強化**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // レート制限追加
      allow write: if request.time > resource.data.lastUpdate + duration.value(1, 's');
    }
    
    match /tasks/{taskId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        // 1日あたりのタスク生成数制限
        getUserTaskCountToday(request.auth.uid) < 50;
    }
  }
}
```

**3. フロントエンド安定化**
```typescript
// useEffect依存配列の最適化
const loadUserData = useCallback(async (userId: string) => {
  // ...
}, []); // 依存配列を最小化

// 重複実行防止
const [isLoadingUserData, setIsLoadingUserData] = useState(false);

useEffect(() => {
  if (user && !isLoadingUserData) {
    setIsLoadingUserData(true);
    loadUserData(user.uid).finally(() => {
      setIsLoadingUserData(false);
    });
  }
}, [user]); // userのみ依存
```

### 6.2 監視・アラート体制

**1. Cloud Functionsモニタリング**
- メモリ使用率 80% でアラート
- エラー率 10% でアラート
- 実行時間 30秒 でアラート

**2. Firestoreモニタリング**
- 書き込み回数 1000/分 でアラート
- 新規ユーザー作成 10/分 でアラート

**3. フロントエンドモニタリング**
- エラー率監視
- パフォーマンス監視

### 6.3 開発プロセス改善

**1. 段階的デプロイメント**
- ステージング環境での十分なテスト
- カナリアリリース（少数ユーザーで先行テスト）

**2. コードレビュー強化**
- useEffect依存配列のレビュー必須
- Cloud Functions メモリ・実行時間チェック
- Firestoreルール変更時の影響評価

**3. 自動テスト追加**
- 無限ループ検出テスト
- パフォーマンステスト
- セキュリティテスト

## 7. まとめ

今回の事故は、**フロントエンドのuseEffect無限ループ** と **Cloud Functions定期実行の負荷設計ミス** が組み合わさって発生した複合的な問題でした。

**主要な教訓:**
1. **useEffect依存配列は慎重に設計** - 無限ループの最大の原因
2. **Cloud Functions には適切な制限設定** - メモリ・実行時間・バッチサイズ
3. **Firestoreセキュリティルールで暴走防止** - レート制限・バリデーション
4. **監視体制の重要性** - 早期発見・自動アラート

**緊急対応結果:**
- ✅ 無限ループ完全停止（14:42）
- ✅ Cloud Functions暴走停止
- ✅ Firestore書き込み制御
- ✅ ユーザー影響最小化

**次のステップ:**
1. 段階的なサービス復旧
2. 改善されたコードのテスト・デプロイ
3. 監視体制の構築
4. 再発防止策の実装

---
**報告者:** AI Assistant  
**承認待ち:** 開発チーム
