import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8",
  authDomain: "gemiyou.firebaseapp.com",
  projectId: "gemiyou",
  storageBucket: "gemiyou.firebasestorage.app",
  messagingSenderId: "1047854827926",
  appId: "1:1047854827926:web:e2d3b45f2a8c7d8f123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

console.log('🔥 Firebase初期化完了');
console.log('- App Name:', app.name);
console.log('- Project ID:', firebaseConfig.projectId);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app }; // appをエクスポート

console.log('🔥 Firebase サービス初期化完了');
console.log('- Firestore:', db.app.name);
console.log('- Auth:', auth.app.name);

// MessagingはVAPIDキーが設定されている場合のみ初期化
let messaging: Messaging | null = null;
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

if (vapidKey && vapidKey !== 'your_vapid_key' && vapidKey.length > 20) {
  try {
    messaging = getMessaging(app);
    console.log('Firebase Cloud Messaging initialized');
  } catch (error) {
    console.warn('Failed to initialize Firebase Cloud Messaging:', error);
  }
} else {
  console.log('Firebase Cloud Messaging disabled - no valid VAPID key');
}

export { messaging };

// FCM Token取得とメッセージリスナー
export const requestPermissionAndGetToken = async () => {
  try {
    // MessagingがnullまたはVAPIDキーがない場合はスキップ
    if (!messaging) {
      console.log('Firebase Cloud Messaging is not initialized');
      return null;
    }
    
    // VAPID キーがない場合やプレースホルダーの場合はFCMをスキップ
    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    if (!vapidKey || vapidKey === 'your_vapid_key' || vapidKey.length < 20) {
      console.log('VAPID キーが設定されていないため、FCMをスキップします');
      return null;
    }
    
    // Notificationがサポートされていない場合もスキップ
    if (!('Notification' in window)) {
      console.log('ブラウザが通知をサポートしていません');
      return null;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
      });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('通知の許可が得られませんでした');
      return null;
    }
  } catch (error) {
    console.error('FCMトークンの取得に失敗しました:', error);
    return null;
  }
};

// フォアグラウンドでのメッセージ受信
export const onMessageListener = () =>
  new Promise((resolve, reject) => {
    try {
      if (!messaging) {
        reject(new Error('Firebase Cloud Messaging is not initialized'));
        return;
      }
      
      onMessage(messaging, (payload) => {
        console.log('フォアグラウンドでメッセージを受信:', payload);
        resolve(payload);
      });
    } catch (error) {
      console.error('メッセージリスナーエラー:', error);
      reject(error);
    }
  });

// 匿名ログイン
export const signInAnonymous = async (): Promise<User | null> => {
  try {
    console.log('🔐 匿名ログイン開始...');
    
    // Firebase Authが初期化されているか確認
    if (!auth) {
      console.error('❌ Firebase Auth が初期化されていません');
      return null;
    }
    
    console.log('🔐 Firebase Auth 初期化確認完了');
    console.log('🔐 プロジェクトID:', auth.app.options.projectId);
    
    // 匿名ログインを実行
    console.log('🔐 signInAnonymously 実行中...');
    const result = await signInAnonymously(auth);
    
    if (result && result.user) {
      console.log('✅ 匿名ログイン成功:', result.user.uid);
      console.log('✅ ユーザー情報:', {
        uid: result.user.uid,
        isAnonymous: result.user.isAnonymous,
        creationTime: result.user.metadata.creationTime
      });
      return result.user;
    } else {
      console.error('❌ 匿名ログイン失敗: result または user が null');
      return null;
    }
  } catch (error: any) {
    console.error('💥 匿名ログインエラー:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Firebase Auth の特定のエラーコードを処理
    if (error.code === 'auth/operation-not-allowed') {
      console.error('❌ 匿名認証が無効になっています。Firebase Console で有効にしてください。');
    } else if (error.code === 'auth/network-request-failed') {
      console.error('❌ ネットワークエラー: インターネット接続を確認してください。');
    }
    
    return null;
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  console.log('🔐 認証状態監視を開始');
  return onAuthStateChanged(auth, (user) => {
    console.log('🔐 認証状態変更イベント:', user ? `UID: ${user.uid}` : 'ログアウト');
    callback(user);
  });
};

export default app;
