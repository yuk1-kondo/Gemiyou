// フロントエンドでの通知許可とトークン取得
// src/services/notificationService.ts

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';

const messaging = getMessaging(app);

// VAPID Key (Firebase Console > Project Settings > Cloud Messaging)
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

/**
 * 通知許可を求めてトークンを取得
 */
export async function requestNotificationPermission() {
  try {
    console.log('🔔 通知許可を求めています...');
    
    // ブラウザの通知許可を求める
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ 通知許可が得られました');
      
      // FCMトークンを取得
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      if (token) {
        console.log('📱 FCMトークン取得成功:', token);
        
        // サーバーにトークンを送信して保存
        await saveTokenToServer(token);
        
        return token;
      } else {
        console.log('❌ FCMトークンの取得に失敗');
      }
      
    } else {
      console.log('❌ 通知許可が拒否されました');
    }
    
  } catch (error) {
    console.error('❌ 通知許可エラー:', error);
  }
}

/**
 * フォアグラウンド通知の設定
 */
export function setupForegroundNotifications() {
  onMessage(messaging, (payload) => {
    console.log('📨 フォアグラウンドでメッセージを受信:', payload);
    
    // カスタム通知表示
    if (payload.notification) {
      showCustomNotification(payload.notification);
    }
  });
}

/**
 * サーバーにトークンを保存
 */
async function saveTokenToServer(token: string) {
  try {
    // ユーザーのトークンをFirestoreに保存
    // これにより、サーバーから個別通知が送信可能
    console.log('💾 トークンをサーバーに保存:', token);
    
  } catch (error) {
    console.error('❌ トークン保存エラー:', error);
  }
}

/**
 * カスタム通知表示
 */
function showCustomNotification(notification: any) {
  // アプリ内でのカスタム通知表示
  console.log('🎯 カスタム通知:', notification);
}

// 使用例
// App.tsx で呼び出し:
// useEffect(() => {
//   requestNotificationPermission();
//   setupForegroundNotifications();
// }, []);
