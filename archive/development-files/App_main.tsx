import React, { useState, useEffect } from 'react';
import './App.css';
import { requestPermissionAndGetToken, onMessageListener, signInAnonymous, onAuthStateChange } from './firebase';
import { geminiService, EnhancedTask } from './services/geminiService';
import { firestoreService } from './services/firestoreService';
import TaskList from './components/TaskList';
import TaskDetailChat from './components/TaskDetailChat';
import { Task } from './services/firestoreService';
import { User } from 'firebase/auth';

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: { [key: string]: string };
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | EnhancedTask | null>(null);
  const [tasks, setTasks] = useState<(Task | EnhancedTask)[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [initStatus, setInitStatus] = useState<string>('認証中...');
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const [isInitializing, setIsInitializing] = useState(false); // 重複初期化防止
  const [error, setError] = useState<string | null>(null); // エラー状態を追加

  useEffect(() => {
    console.log('🚀 App useEffect開始');
    
    // 認証状態の監視
    const unsubscribe = onAuthStateChange((user) => {
      console.log('🔐 認証状態変更:', user ? `ユーザーID: ${user.uid}` : 'ログアウト');
      setUser(user);
      if (user) {
        setInitStatus('アプリを初期化中...');
        initializeApp(user);
      } else {
        // ユーザーが未認証の場合、匿名ログインを実行
        setInitStatus('匿名ログイン中...');
        handleAnonymousSignIn();
      }
    });

    // 10秒後に強制的に初期化を終了するタイムアウト
    const timeoutId = setTimeout(() => {
      if (initializing) {
        console.warn('⏰ 初期化タイムアウト - 強制的に続行します');
        setInitStatus('タイムアウト - 続行します');
        setInitializing(false);
      }
    }, 10000);

    console.log('✅ App useEffect設定完了');
    return () => {
      console.log('🧹 App useEffect クリーンアップ');
      unsubscribe();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行するため空の依存配列

  const handleAnonymousSignIn = async () => {
    try {
      console.log('👤 匿名ログイン試行開始...');
      setInitStatus('匿名ログイン中...');
      const user = await signInAnonymous();
      if (user) {
        console.log('✅ 匿名ログイン成功:', user.uid);
        setInitStatus('ログイン成功 - 初期化中...');
      } else {
        console.log('❌ 匿名ログイン失敗: ユーザーがnull');
        setInitStatus('匿名ログイン失敗 - テストモードで続行');
        // 失敗時でもテスト用のユーザーIDでアプリを続行
        createTestUser();
      }
    } catch (error) {
      console.error('💥 匿名ログインエラー:', error);
      setInitStatus('ログインエラー - テストモードで続行');
      // エラー時でもテスト用のユーザーIDでアプリを続行
      createTestUser();
    }
  };

  const createTestUser = () => {
    // テスト用の疑似ユーザーを作成
    const testUser = {
      uid: 'test-user-' + Date.now(),
      isAnonymous: true,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      }
    } as User;
    
    console.log('🧪 テストユーザー作成:', testUser.uid);
    setUser(testUser);
    initializeAppWithoutAuth(testUser.uid);
  };

  const initializeAppWithoutAuth = async (userId: string) => {
    try {
      setInitializing(true);
      console.log('🧪 テストモード初期化開始:', userId);
      
      setInitStatus('テストデータ準備中...');
      
      // ローカルのタスクデータを作成（Firestore接続なし）
      const testTasks: Task[] = [
        {
          id: 'test-1',
          userId: userId,
          personality: {
            name: 'タスクマスター・アキラ',
            type: 'タスクマスター',
            description: '効率的なタスク管理の専門家',
            style: 'シンプルで分かりやすい指示を出します'
          },
          requestText: 'テストタスク: 今日の気持ちを3つの単語で表現してください',
          evaluated: false,
          createdAt: new Date()
        }
      ];
      
      setTasks(testTasks);
      setInitStatus('テストモード準備完了');
      console.log('🧪 テストモード初期化完了');
      
    } catch (error) {
      console.error('💥 テストモード初期化エラー:', error);
      setInitStatus('テストモード初期化エラー');
    } finally {
      setInitializing(false);
    }
  };

  const initializeApp = async (user: User) => {
    // 既に初期化中の場合は重複実行を防ぐ
    if (isInitializing) {
      console.log('⚠️ 初期化は既に実行中です');
      return;
    }
    
    try {
      setIsInitializing(true);
      setInitializing(true);
      console.log('🔧 アプリ初期化開始:', user.uid);
      
      // FCMトークンを取得してユーザーを作成（エラーがあっても続行）
      try {
        console.log('📡 FCMトークン取得開始...');
        setInitStatus('通知設定中...');
        const token = await requestPermissionAndGetToken();
        console.log('📡 FCMトークン取得結果:', token ? 'あり' : 'なし');
        
        setInitStatus('ユーザー情報作成中...');
        if (token) {
          await firestoreService.createUser(user.uid, token);
          await firestoreService.saveFCMToken(user.uid, token);
          console.log('✅ ユーザー作成（FCMトークンあり）完了');
        } else {
          // トークンがなくてもユーザーは作成
          await firestoreService.createUser(user.uid, '');
          console.log('✅ ユーザー作成（FCMトークンなし）完了');
        }
      } catch (fcmError) {
        console.warn('⚠️ FCM初期化エラー（続行します）:', fcmError);
        setInitStatus('通知設定をスキップしています...');
        // FCMエラーがあってもユーザーは作成
        try {
          await firestoreService.createUser(user.uid, '');
          console.log('✅ ユーザー作成（FCMエラー時）完了');
        } catch (userError) {
          console.error('💥 ユーザー作成エラー:', userError);
        }
      }
      
      // 既存のタスクを取得
      console.log('📋 タスク読み込み開始...');
      setInitStatus('タスクを読み込み中...');
      await loadTasks(user.uid);
      console.log('✅ タスク読み込み完了');
      
      // メッセージリスナーを設定（エラーがあっても続行）
      try {
        console.log('👂 メッセージリスナー設定開始...');
        setInitStatus('通知リスナー設定中...');
        setupMessageListener(user.uid);
        console.log('✅ メッセージリスナー設定完了');
      } catch (listenerError) {
        console.warn('⚠️ メッセージリスナー設定エラー（続行します）:', listenerError);
      }
      
      setInitStatus('初期化完了');
      console.log('🎉 アプリ初期化完了');
    } catch (error) {
      console.error('💥 アプリの初期化エラー:', error);
      setInitStatus('初期化エラーが発生しました');
    } finally {
      setInitializing(false);
      setIsInitializing(false);
    }
  };

  const setupMessageListener = (userId: string) => {
    onMessageListener()
      .then((payload: any) => {
        console.log('通知を受信:', payload);
        setNotification(payload);
        // 新しいタスクが来た場合、タスク一覧を更新
        loadTasks(userId);
      })
      .catch((error) => {
        console.warn('メッセージリスナーエラー（無視します）:', error);
      });
  };

  const loadTasks = async (userId: string) => {
    try {
      console.log('📋 タスク読み込み開始:', userId);
      const userTasks = await firestoreService.getUserTasks(userId);
      console.log('📋 取得したタスク数:', userTasks.length);
      setTasks(userTasks);
    } catch (error) {
      console.error('💥 タスク読み込みエラー:', error);
    }
  };

  const generateNewTask = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // テストモードでも新しい拡張システムを使用
      console.log('🚀 新しい拡張タスク生成システムを使用中...');
      const task = await geminiService.generateTaskWithCloudFunction();
      console.log('✅ 生成されたタスク:', task);
      
      // タスク一覧を更新
      await loadTasks(user.uid);
      
      // taskの構造に合わせてalertメッセージを修正
      const taskTitle = task.request || task.title || 'タスク';
      const taskContext = task.context || task.description || '';
      
      alert(`新しいタスクが届きました！\n\n${task.aiPersonality.name}（${task.aiPersonality.type}）より:\n\n${taskTitle}\n\n${taskContext}`);
      
    } catch (error) {
      console.error('💥 タスク生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`タスクの生成に失敗しました。エラー: ${errorMessage}\n\nもう一度お試しください。`);
    } finally {
      setLoading(false);
    }
  };

  const openTaskDetail = (task: Task | EnhancedTask) => {
    setSelectedTask(task);
    setCurrentView('detail');
  };

  const closeTaskDetail = () => {
    setCurrentView('list');
    setSelectedTask(null);
    if (user) {
      loadTasks(user.uid); // タスク一覧を更新
    }
  };

  // デバッグ用: Firebase設定確認
  useEffect(() => {
    console.log('🔧 Firebase設定確認:');
    console.log('- API Key:', process.env.REACT_APP_FIREBASE_API_KEY ? '設定済み' : '未設定');
    console.log('- Project ID:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
    console.log('- Auth Domain:', process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
    console.log('- VAPID Key:', process.env.REACT_APP_FIREBASE_VAPID_KEY ? '設定済み' : '未設定');
  }, []);

  // 初期化中の表示
  if (initializing || !user) {
    return (
      <div className="App">
        <header className="app-header">
          <h1>🧠 Chatヒューマン</h1>
          <p>初期化中...</p>
        </header>
        <main className="app-main">
          <div className="loading-container">
            <div className="loading-spinner">⏳</div>
            <p>アプリを準備しています...</p>
            <p className="init-status">{initStatus}</p>
            
            {initStatus.includes('ログイン失敗') || initStatus.includes('ログインエラー') ? (
              <div className="error-help">
                <h4>📋 Firebase認証設定が必要です</h4>
                <ol>
                  <li>
                    <a 
                      href="https://console.firebase.google.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Firebase Console
                    </a>
                    を開く
                  </li>
                  <li>「Authentication」→「Sign-in method」に移動</li>
                  <li>「匿名」プロバイダーを有効にする</li>
                  <li>このページを再読み込み</li>
                </ol>
                <button 
                  onClick={() => window.location.reload()} 
                  className="retry-btn"
                >
                  🔄 再試行
                </button>
              </div>
            ) : (
              <small className="loading-hint">
                時間がかかる場合はページを再読み込みしてください
              </small>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="App" style={{
      background: '#fccc00',
      minHeight: '100vh',
      color: '#2c3e50'
    }}>
      <header className="app-header" style={{
        backgroundColor: '#eb6100',
        color: 'white',
        borderBottom: '5px solid #004c97',
        padding: '20px'
      }}>
        <div className="header-content">
          <div>
            <h1>🧠 Chatヒューマン</h1>
            <p>AIからの依頼に応える新しい体験</p>
          </div>
          {user?.uid.startsWith('test-user-') && (
            <div className="test-mode-badge" style={{
              backgroundColor: '#fccc00',
              color: '#2c3e50',
              border: '2px solid #914e25'
            }}>
              🧪 テストモード
            </div>
          )}
        </div>
      </header>

      {notification && (
        <div className="notification-banner">
          <h3>📬 新しい通知</h3>
          <p><strong>{notification.notification?.title}</strong></p>
          <p>{notification.notification?.body}</p>
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <main className="app-main" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        minHeight: 'calc(100vh - 120px)'
      }}>
        <div className="center-content" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
          maxWidth: '800px'
        }}>
        {currentView === 'list' ? (
          <div className="center-list" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}>
            <div className="action-section" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: '32px'
            }}>
              <button 
                onClick={generateNewTask} 
                disabled={loading}
                className="generate-task-btn"
                style={{
                  backgroundColor: '#004c97',
                  color: 'white',
                  border: '3px solid #15722c',
                  padding: '15px 30px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {loading ? '⏳ 生成中...' : '🎲 新しいAI依頼を生成'}
              </button>
            </div>
            
            <TaskList 
              tasks={tasks} 
              onTaskSelect={openTaskDetail}
              onTasksUpdate={() => user && loadTasks(user.uid)}
            />
          </div>
        ) : (
          selectedTask && (
            <TaskDetailChat 
              task={selectedTask} 
              onClose={closeTaskDetail}
              userId={user.uid}
            />
          )
        )}
        </div>
      </main>
    </div>
  );
}

export default App;
