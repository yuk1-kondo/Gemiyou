const admin = require('firebase-admin');

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'gemiyou'
  });
}

async function generateVAPIDKey() {
  try {
    // Firebase プロジェクトの設定情報を取得
    console.log('🔑 VAPIDキーを生成中...');
    
    // VAPIDキーペアを生成（この部分は手動設定が必要）
    console.log('\n📋 VAPIDキー設定手順:');
    console.log('1. Firebase Console にアクセス: https://console.firebase.google.com/project/gemiyou/settings/cloudmessaging');
    console.log('2. "Web プッシュ証明書" タブで "キーペアを生成" をクリック');
    console.log('3. 生成されたキーを .env ファイルに設定');
    console.log('\n🔧 .env ファイルに以下を追加:');
    console.log('REACT_APP_FIREBASE_VAPID_KEY=<生成されたキー>');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

generateVAPIDKey();
