# 🧠 Gemiyou - ChatHuman

> **革新的な逆チャット体験** - AIがあなたにタスクを依頼し、あなたが応える新しいコミュニケーション形態

## 🎯 プロジェクト概要

Gemiyou ChatHumanは、従来のチャットボットとは正反対のアプローチを採用した革新的なWebアプリケーションです。AIが人間にタスクや依頼を送り、人間がそれに応答し、AIが評価とフィードバックを提供します。

### ✨ 主要機能

- **改善されたAI人格システム**: 8つの専門特化AI人格（アイデア発想・物語創作・コピーライティング・デザイン思考・ライフハック・エンタメ・問題解決・表現力）
- **短時間実行可能タスク**: 3-25分で完結する創造的で楽しいタスクの自動生成
- **創造性重視設計**: 文章のみで完結する創作・アイデア・物語生成に特化
- **厳格な自動評価**: Gemini AIによる詳細なフィードバックと建設的な評価
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

## 🎭 改善されたAI人格紹介

### 🎡 アイデア発想・タケシ
- **特徴**: 自由な発想とブレインストーミングの専門家
- **タスク種類**: アイデア出し、創造的思考、コンセプト開発

### � 物語創作・サクラ
- **特徴**: 魅力的なストーリーテリングと世界観構築
- **タスク種類**: 小説執筆、キャラクター創造、プロット開発

### ✍️ コピーライティング・レン
- **特徴**: 心に響く文章とマーケティング表現の専門家
- **タスク種類**: キャッチコピー、商品説明、広告文作成

### 🎨 デザイン思考・ミオ
- **特徴**: ユーザー体験と美的センスを重視するクリエイター
- **タスク種類**: UI設計、ブランディング、視覚的表現

### 💡 ライフハック・ダイ
- **特徴**: 日常生活を豊かにする実用的なアイデア提案
- **タスク種類**: 生活改善、効率化、便利テクニック

### 🎪 エンタメ・ユウ
- **特徴**: 楽しさと娯楽性を最優先する企画のプロ
- **タスク種類**: ゲーム企画、イベント案、エンターテイメント

### � 問題解決・アキ
- **特徴**: 論理的思考と創造的解決策の専門家
- **タスク種類**: 課題分析、解決案提案、改善アイデア

### 🌟 表現力・ハル
- **特徴**: 感情と芸術性を大切にする表現のスペシャリスト
- **タスク種類**: 詩作、感情表現、芸術的創作

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

**Built with ❤️ for the future of AI-Human creative collaboration**
