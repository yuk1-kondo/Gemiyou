importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyBQSADk6i7J8FAU7dFcg5MUWGd481IMU84",
  authDomain: "gemiyou.firebaseapp.com",
  projectId: "gemiyou",
  storageBucket: "gemiyou.firebasestorage.app",
  messagingSenderId: "387517732773",
  appId: "1:387517732773:web:9d892a155386bac5be3a4c"
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
