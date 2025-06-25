# Gemiyou - プロジェクト構成

## 📁 ディレクトリ構造

```
Gemiyou-1/
├── src/                        # React アプリケーション
│   ├── components/             # React コンポーネント
│   │   ├── Auth.js            # 認証コンポーネント
│   │   ├── Auth.css           # 認証画面スタイル
│   │   ├── TaskGenerator.js   # メインアプリケーション
│   │   └── TaskGenerator.css  # メインアプリスタイル
│   ├── services/              # サービス層
│   │   ├── geminiService.ts   # Gemini AI API連携
│   │   ├── firestoreService.ts # Firestore連携
│   │   └── notificationService.ts # プッシュ通知
│   ├── App.tsx                # アプリルート
│   ├── App.css                # アプリ全体スタイル
│   ├── firebase.ts            # Firebase設定
│   └── index.tsx              # エントリポイント
├── functions/                  # Cloud Functions
│   ├── index.js               # サーバーレス関数
│   └── package.json           # 依存関係
├── public/                     # 静的アセット
│   ├── index.html             # HTMLテンプレート
│   ├── manifest.json          # PWA設定
│   └── firebase-messaging-sw.js # Service Worker
├── firebase.json              # Firebase設定
├── firestore.rules           # Firestore セキュリティルール
├── package.json              # プロジェクト依存関係
└── tsconfig.json            # TypeScript設定
```

## 🧠 AI人格システム

### 実装されている10のAI人格

| AI人格 | 専門領域 | タスクタイプ |
|--------|----------|-------------|
| 🎡 タケシ | アイデア発想 | ブレインストーミング、コンセプト開発 |
| 📚 サクラ | 物語創作 | 小説執筆、キャラクター創造 |
| ✍️ レン | コピーライティング | キャッチコピー、広告文作成 |
| 🎨 ミオ | デザイン思考 | UI設計、ブランディング |
| 💡 ダイ | ライフハック | 生活改善、効率化アイデア |
| 🎪 ユウ | エンタメ | ゲーム企画、イベント案 |
| 🔧 アキ | 問題解決 | 課題分析、解決案提案 |
| 🌟 ハル | 表現力 | 詩作、感情表現、芸術的創作 |
| 🧠 ナレッジマスター | 知識統合 | 学習方法、情報整理 |
| 🔮 フューチャリスト | 未来予測 | トレンド分析、イノベーション |

## 🔧 技術スタック詳細

### フロントエンド
- **React 18**: 最新のReact機能とHooks
- **TypeScript**: 型安全な開発
- **Modern CSS**: グラデーション、アニメーション
- **Firebase SDK**: リアルタイムデータベース連携

### バックエンド
- **Firebase Firestore**: NoSQLデータベース
- **Cloud Functions**: サーバーレス実行環境
- **Firebase Authentication**: 認証システム
- **Firebase Hosting**: 静的サイトホスティング
- **FCM**: プッシュ通知サービス

### AI エンジン
- **Google Gemini AI API**: タスク生成・評価
- **プロンプトエンジニアリング**: 人格別の専門プロンプト
- **JSON構造化**: 構造化されたAIレスポンス

## 📊 データフロー

```
User Action → React Component → Service Layer → Firebase/Gemini → Response → UI Update
```

### 主要な処理フロー

1. **タスク生成**:
   - ユーザーがボタンクリック
   - Cloud Functionsが呼び出し
   - Gemini AIがタスク生成
   - Firestoreに保存
   - リアルタイムでUI更新

2. **タスク評価**:
   - ユーザーが回答送信
   - Gemini AIが評価実行
   - 詳細フィードバック生成
   - 結果をFirestoreに保存
   - 統計情報更新

## 🔐 セキュリティ

### Firestore セキュリティルール
- 認証済みユーザーのみアクセス可能
- ユーザー個人データの分離
- 読み取り専用/書き込み権限の適切な分離

### API キー管理
- 環境変数による秘匿情報管理
- Firebase設定の適切な暗号化
- フロントエンド/バックエンドの分離

## 🚀 デプロイメント

### 自動デプロイ
```bash
npm run build    # プロダクションビルド
firebase deploy  # Firebase Hostingにデプロイ
```

### 環境分離
- 開発環境: `firebase use default`
- 本番環境: `firebase use production`

## 📈 パフォーマンス最適化

### フロントエンド最適化
- React.memo によるコンポーネントメモ化
- useCallback/useMemo によるパフォーマンス向上
- ローカルストレージによるデータキャッシュ

### バックエンド最適化
- Cloud Functions のコールドスタート最小化
- Firestore インデックス最適化
- データ構造の正規化

## 🔄 開発ワークフロー

### Git ブランチ戦略
```
main (production)
├── develop
├── feature/ai-personalities
├── feature/ui-improvements
└── hotfix/bug-fixes
```

### コード品質
- TypeScript による型チェック
- ESLint によるコード規約
- Prettier による自動フォーマット

## 📱 PWA 機能

### Service Worker
- オフライン対応
- プッシュ通知受信
- キャッシュ戦略最適化

### Manifest
- アプリアイコン設定
- スプラッシュスクリーン
- インストール可能なWebアプリ
