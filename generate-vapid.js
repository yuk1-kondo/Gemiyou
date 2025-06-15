// Firebase Admin SDK で VAPID キーを生成するスクリプト
const admin = require('firebase-admin');

// サービスアカウントキーファイルのパス（あなたの環境に合わせて調整）
const serviceAccount = require('./auth_config.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'gemiyou'
});

async function generateVAPIDKey() {
  try {
    console.log('🔑 VAPID キーを生成中...');
    
    // Firebase Admin SDK の messaging サービスを使用
    const messaging = admin.messaging();
    
    console.log('✅ Firebase Admin SDK 初期化完了');
    console.log('📋 次のステップ:');
    console.log('1. Firebase Console にアクセス:');
    console.log('   https://console.firebase.google.com/project/gemiyou/settings/cloudmessaging/');
    console.log('2. "Web configuration" セクションで "Generate key pair" をクリック');
    console.log('3. 生成されたキーを .env.local ファイルに追加:');
    console.log('   REACT_APP_FIREBASE_VAPID_KEY=<生成されたキー>');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

generateVAPIDKey();
