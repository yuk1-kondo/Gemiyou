importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8",
  authDomain: "gemiyou.firebaseapp.com",
  projectId: "gemiyou",
  storageBucket: "gemiyou.firebasestorage.app",
  messagingSenderId: "1047854827926",
  appId: "1:1047854827926:web:e2d3b45f2a8c7d8f123456"
});

const messaging = firebase.messaging();

// バックグラウンドメッセージハンドラー
messaging.onBackgroundMessage(function(payload) {
  console.log('バックグラウンドでメッセージを受信:', payload);
  
  const notificationTitle = payload.notification.title || '🧠 AIからの依頼';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png',
    badge: '/firebase-logo.png',
    actions: [
      {
        action: 'open-task',
        title: 'タスクを開く'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open-task') {
    // タスク詳細ページを開く
    event.waitUntil(
      clients.openWindow('/tasks')
    );
  }
});
