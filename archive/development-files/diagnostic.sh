#!/bin/bash

echo "� Chatヒューマン タスク生成問題診断スクリプト"
echo "=============================================="

cd /Users/yuki/Gemiyou

echo ""
echo "1️⃣ Firebase プロジェクト接続確認..."
firebase projects:list

echo ""
echo "2️⃣ Cloud Functions 一覧確認..."
firebase functions:list

echo ""
echo "3️⃣ 環境変数確認..."
firebase functions:config:get

echo ""
echo "4️⃣ Cloud Functions ログ確認 (最新10件)..."
firebase functions:log --limit 10

echo ""
echo "5️⃣ ネットワーク接続テスト..."
echo "📡 createDynamicTask エンドポイントに接続テスト..."
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "\n%{http_code} - %{time_total}s\n" \
  https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask

echo ""
echo "6️⃣ 簡単なPOSTリクエストテスト..."
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"beginner","userId":"test-user"}' \
  -w "\n%{http_code} - %{time_total}s\n" \
  https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask

echo ""
echo "=============================================="
echo "🎯 診断完了！上記の結果から問題を特定してください："
echo "- Firebase プロジェクト: 接続可能か"
echo "- Cloud Functions: デプロイされているか"
echo "- 環境変数: 正しく設定されているか"
echo "- ネットワーク: エンドポイントにアクセス可能か"
echo "- POST リクエスト: 正常なレスポンスが返るか"
