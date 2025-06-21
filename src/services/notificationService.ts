// ローカル通知サービス（Firebase Messaging の代替）

import { requestPermissionAndGetToken } from '../firebase';
import { firestoreService } from './firestoreService';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private isSupported: boolean = false;
  private hasPermission: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.hasPermission = this.isSupported && Notification.permission === 'granted';
  }

  // 通知許可を求める（FCMトークンも取得）
  async requestPermission(userId?: string): Promise<boolean> {
    if (!this.isSupported) {
      console.log('このブラウザは通知をサポートしていません');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      
      if (this.hasPermission && userId) {
        // FCMトークンの取得を試行
        try {
          const fcmToken = await requestPermissionAndGetToken();
          if (fcmToken && fcmToken.length > 20) {
            // 実際のFCMトークンをFirestoreに保存
            await firestoreService.updateFCMToken(userId, fcmToken);
            console.log('✅ FCMトークンを取得・保存しました:', fcmToken.substring(0, 20) + '...');
          } else {
            console.log('ℹ️ FCMトークンの取得に失敗しましたが、ローカル通知は利用可能です');
          }
        } catch (fcmError) {
          console.log('ℹ️ FCMトークンの取得に失敗しましたが、ローカル通知は利用可能です:', fcmError);
        }
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('通知許可の取得に失敗:', error);
      return false;
    }
  }

  // 通知を送信
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: options.requireInteraction || false,
        tag: 'gemiyou-task', // 重複通知を防ぐ
      });

      // クリック時の動作
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5秒後に自動で閉じる
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('通知の送信に失敗:', error);
      return false;
    }
  }

  // タスク生成通知
  async notifyNewTask(aiName: string, taskContent: string): Promise<boolean> {
    return this.sendNotification({
      title: `🧠 ${aiName}からの依頼`,
      body: taskContent.length > 60 ? 
        taskContent.substring(0, 57) + '...' : 
        taskContent,
      requireInteraction: true,
    });
  }

  // 定期的な通知（デモ用）
  async scheduleDemo(): Promise<void> {
    if (!this.hasPermission) {
      await this.requestPermission();
    }

    // 5秒後にデモ通知
    setTimeout(() => {
      this.sendNotification({
        title: '🎲 新しいタスクの時間です！',
        body: 'AIがあなたのための創造的なタスクを用意しました',
        requireInteraction: true,
      });
    }, 5000);
  }

  // 通知状態の確認
  getStatus(): { isSupported: boolean; hasPermission: boolean; permissionState: string } {
    return {
      isSupported: this.isSupported,
      hasPermission: this.hasPermission,
      permissionState: this.isSupported ? Notification.permission : 'not-supported',
    };
  }
}

export const notificationService = new NotificationService();
