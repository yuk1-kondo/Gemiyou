// ローカル通知サービス（Firebase Messaging の代替）

import { firestoreService } from './firestoreService';

class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.hasPermission = this.isSupported && Notification.permission === 'granted';
  }

  // 通知許可を求める
  async requestPermission(userId) {
    if (!this.isSupported) {
      console.warn('このブラウザは通知をサポートしていません');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      
      return this.hasPermission;
    } catch (error) {
      console.error('通知許可取得エラー:', error);
      return false;
    }
  }

  // ローカル通知を表示
  async showNotification(options) {
    if (!this.hasPermission) {
      console.warn('通知許可がありません');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/logo192.png',
        requireInteraction: options.requireInteraction || false,
        tag: options.tag || 'gemiyou-notification'
      });

      // 通知をクリックした時の処理
      notification.onclick = function() {
        window.focus();
        notification.close();
      };

      // 自動で閉じる（5秒後）
      setTimeout(() => {
        notification.close();
      }, 5000);

      return true;
    } catch (error) {
      console.error('通知表示エラー:', error);
      return false;
    }
  }

  // タスク完了通知
  async notifyTaskCompletion(score, encouragement) {
    const options = {
      title: '🎉 タスク完了！',
      body: `スコア: ${score}点\n${encouragement || 'よく頑張りました！'}`,
      requireInteraction: true,
      tag: 'task-completion'
    };

    return this.showNotification(options);
  }

  // 新しいタスク通知
  async notifyNewTask(taskTitle) {
    const options = {
      title: '📝 新しいタスクが利用可能です',
      body: taskTitle || '新しいチャレンジを始めましょう！',
      tag: 'new-task'
    };

    return this.showNotification(options);
  }

  // 一般的な通知
  async notify(title, body, options = {}) {
    const notificationOptions = {
      title,
      body,
      ...options
    };

    return this.showNotification(notificationOptions);
  }

  // 通知の許可状態を確認
  getPermissionStatus() {
    if (!this.isSupported) return 'not-supported';
    return Notification.permission;
  }

  // サービスワーカー経由での通知（より高度な機能）
  async showServiceWorkerNotification(options) {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker はサポートされていません');
      return this.showNotification(options);
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        data: options.data || {},
        actions: options.actions || [],
        requireInteraction: options.requireInteraction || false
      });

      return true;
    } catch (error) {
      console.error('ServiceWorker通知エラー:', error);
      // フォールバックとして通常の通知を使用
      return this.showNotification(options);
    }
  }

  // バックグラウンド通知のスケジュール（例：1時間後にリマインダー）
  scheduleReminder(delayMinutes = 60) {
    setTimeout(() => {
      this.showNotification({
        title: '⏰ Gemiyou リマインダー',
        body: '新しいタスクにチャレンジしてみませんか？',
        requireInteraction: true,
        tag: 'reminder'
      });
    }, delayMinutes * 60 * 1000);
  }
}

export const notificationService = new NotificationService();
