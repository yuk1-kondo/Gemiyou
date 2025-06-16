#!/bin/bash

echo "🔧 Firebase Cloud Functions 環境変数設定スクリプト"
echo "================================================="

cd /Users/yuki/Gemiyou

# Gemini API キーを設定
echo "🔑 Gemini API キーを設定中..."
firebase functions:config:set gemini.api_key="AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8"

echo "📊 現在の環境変数を確認..."
firebase functions:config:get

echo "🚀 Cloud Functions をデプロイ中..."
firebase deploy --only functions

echo "✅ セットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "1. デプロイが成功したことを確認"
echo "2. https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask にアクセス可能か確認"
echo "3. テストページで動作確認"
