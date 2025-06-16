import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

const messaging = getMessaging(app);
const functions = getFunctions(app);

// VAPID Key - 実際のキーに置き換えてください
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';

/**
 * 通知許可を求めてトークンを取得
 */
export async function requestNotificationPermission(userId: string) {
  try {
    console.log('🔔 通知許可を求めています...');
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ 通知許可が得られました');
      
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      if (token) {
        console.log('📱 FCMトークン取得成功:', token);
        
        // ユーザーのトークンをFirestoreに保存
        await setDoc(doc(db, 'users', userId), {
          fcmToken: token,
          notificationEnabled: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
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
    
    if (payload.notification) {
      showCustomNotification(payload.notification);
    }
  });
}

/**
 * カスタム通知表示
 */
function showCustomNotification(notification: any) {
  // ブラウザ通知を表示
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title || 'Gemiyou', {
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: 'gemiyou-task',
      requireInteraction: true
    });
  }
  
  console.log('🎯 新しいタスク通知:', notification);
}

/**
 * 新しい動的タスクを生成してリクエスト
 */
export async function requestNewTask(difficulty: string = 'beginner', userId?: string) {
  try {
    const createDynamicTask = httpsCallable(functions, 'createDynamicTask');
    const result = await createDynamicTask({ difficulty, userId });
    
    console.log('✅ 新しい動的タスクをリクエストしました:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ 動的タスクリクエストエラー:', error);
    throw error;
  }
}

/**
 * タスクの回答を評価してもらう
 */
export async function evaluateTaskResponse(taskId: string, userResponse: string) {
  try {
    const evaluateResponse = httpsCallable(functions, 'evaluateTaskResponse');
    const result = await evaluateResponse({ taskId, userResponse });
    
    console.log('✅ タスク評価完了:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ タスク評価エラー:', error);
    throw error;
  }
}
