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

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };

// MessagingはVAPIDキーが設定されている場合のみ初期化
let messaging: Messaging | null = null;
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

if (vapidKey && vapidKey !== 'your_vapid_key' && vapidKey.length > 20) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    // FCM初期化失敗は無視
  }
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
      return null;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: vapidKey,
      });
      return token;
    } else {
      return null;
    }
  } catch (error) {
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
        resolve(payload);
      });
    } catch (error) {
      reject(error);
    }
  });

// 匿名ログイン
export const signInAnonymous = async (): Promise<User | null> => {
  try {
    // Firebase Authが初期化されているか確認
    if (!auth) {
      return null;
    }
    
    // 匿名ログインを実行
    const result = await signInAnonymously(auth);
    
    if (result && result.user) {
      return result.user;
    } else {
      return null;
    }
  } catch (error: any) {
    return null;
  }
};

// 認証状態の監視
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export default app;
