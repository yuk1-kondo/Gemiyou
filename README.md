# 🧠 Chatヒューマン

> **革新的な逆チャット体験** - AIがあなたにタスクを依頼し、あなたが応える新しいコミュニケーション形態

## 🎯 プロジェクト概要

Chatヒューマンは、従来のチャットボットとは正反対のアプローチを採用した革新的なWebアプリケーションです。AIが人間にタスクや依頼を送り、人間がそれに応答し、AIが評価とフィードバックを提供します。

### ✨ 主要機能

- **AI人格システム**: 4つの異なるAI人格（タスクマスター・アキラ、クリエイター・ユイ、アナリスト・ケン、コーチ・サラ）
- **動的タスク生成**: Gemini AIによる創造的で実行可能なタスクの自動生成
- **リアルタイム評価**: AIによる即座のフィードバックと建設的な評価
- **プッシュ通知**: Firebase Cloud Messagingによる新しいタスクの通知
- **レスポンシブUI**: モダンなグラデーションデザインとスムーズなアニメーション

### 🛠️ 技術スタック

**フロントエンド:**
- React 18 + TypeScript
- Firebase SDK (Auth, Firestore, FCM)
- Modern CSS with gradients and animations

**バックエンド:**
- Firebase Firestore (データベース)
- Firebase Cloud Functions (サーバーレス)
- Firebase Authentication (匿名認証)
- Firebase Hosting

**AI:**
- Google Gemini AI API
- 動的プロンプト生成
- JSON構造化レスポンス

## 🚀 セットアップ手順

### 1. プロジェクトのクローンとインストール

```bash
git clone <repository-url>
cd chat-human
npm install
```

### 2. Firebase設定

```bash
# Firebase CLIのインストール
npm install -g firebase-tools

# Firebaseログイン
firebase login

# プロジェクトの初期化
firebase init
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key

# Gemini AI Configuration
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

### 4. 開発サーバーの起動

```bash
npm start
```

## 📱 使用方法

1. **アプリケーションアクセス**: https://gemiyou.web.app
2. **自動認証**: 匿名ログインで即座に利用開始
3. **タスク生成**: 「新しいAI依頼を生成」ボタンをクリック
4. **タスク実行**: 表示されたタスクを選択して内容を確認
5. **回答提出**: テキストエリアに回答を入力して送信
6. **評価受取**: AIからの詳細なフィードバックを確認

## 🎭 AI人格紹介

### タスクマスター・アキラ 📋
- **特徴**: 効率重視の厳格なタスク管理者
- **タスク種類**: 生産性向上、時間管理、組織化

### クリエイター・ユイ 🎨
- **特徴**: 創造性と芸術性を重視する自由な発想
- **タスク種類**: 創作活動、アイデア発想、芸術表現

### アナリスト・ケン 📊
- **特徴**: データと論理を愛する客観的分析家
- **タスク種類**: 分析、比較、論理的思考

### コーチ・サラ 💪
- **特徴**: 成長支援に特化した温かいサポーター
- **タスク種類**: 自己啓発、スキル向上、モチベーション

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Firebase      │    │   Gemini AI     │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (AI Engine)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐             ┌─────────┐             ┌─────────┐
    │   UI    │             │Firestore│             │ Prompt  │
    │Components│             │Functions│             │Generate │
    │         │             │   FCM   │             │Evaluate │
    └─────────┘             └─────────┘             └─────────┘
```

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストやイシューは歓迎します！

## 📞 お問い合わせ

プロジェクトに関するご質問やフィードバックをお待ちしています。

---

**Built with ❤️ for the future of AI-Human interaction**

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
