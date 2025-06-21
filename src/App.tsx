import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { geminiService } from './services/geminiService';
import { Task } from './types';
import TaskDetail from './components/TaskDetail';
import { notificationService } from './services/notificationService';
import { firestoreService } from './services/firestoreService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskGenerating, setTaskGenerating] = useState(false);
  const [generatedTask, setGeneratedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userStats, setUserStats] = useState<any>({ totalTasks: 0, completedToday: 0, totalScore: 0 });
  const [dataLoaded, setDataLoaded] = useState(false);

  // アプリ起動時に即座にローカルストレージからデータを読み込み
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('gemiyou-tasks');
      const savedStats = localStorage.getItem('gemiyou-stats');
      const savedGeneratedTask = localStorage.getItem('gemiyou-generated-task');
      
      console.log('🚀 ローカルストレージ確認中...');
      console.log('- タスク:', savedTasks ? 'あり' : 'なし');
      console.log('- 統計:', savedStats ? 'あり' : 'なし');
      console.log('- 最新タスク:', savedGeneratedTask ? 'あり' : 'なし');
      
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        setTasks(tasks);
        console.log('🚀 アプリ起動時：ローカルストレージからタスクを復元:', tasks.length, '件');
      }
      
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        setUserStats(stats);
        console.log('🚀 アプリ起動時：ローカルストレージから統計を復元:', stats);
        console.log('  - 生成済みタスク:', stats.totalTasks);
        console.log('  - 今日の完了:', stats.completedToday);
        console.log('  - 合計点数:', stats.totalScore);
      } else {
        console.log('🚀 統計データがローカルストレージにありません');
      }
      
      if (savedGeneratedTask) {
        const task = JSON.parse(savedGeneratedTask);
        setGeneratedTask(task);
        console.log('🚀 アプリ起動時：ローカルストレージから最新タスクを復元');
      }
    } catch (error) {
      console.error('🚀 アプリ起動時：ローカルストレージ読み込みエラー:', error);
    }
  }, []); // 初回のみ実行

  // ローカルストレージからデータを読み込み
  const loadFromLocalStorage = useCallback(() => {
    try {
      const savedTasks = localStorage.getItem('gemiyou-tasks');
      const savedStats = localStorage.getItem('gemiyou-stats');
      const savedGeneratedTask = localStorage.getItem('gemiyou-generated-task');
      
      console.log('🔄 ローカルストレージから復元開始');
      console.log('- 保存されているデータ:', {
        tasks: savedTasks ? '✅' : '❌',
        stats: savedStats ? '✅' : '❌', 
        generatedTask: savedGeneratedTask ? '✅' : '❌'
      });
      
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        setTasks(tasks);
        console.log('📋 ローカルストレージからタスクを復元:', tasks.length, '件');
      }
      
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        setUserStats(stats);
        console.log('📊 ローカルストレージから統計を復元:', stats);
      } else {
        console.log('⚠️ 統計データがローカルストレージにありません');
      }
      
      if (savedGeneratedTask) {
        const task = JSON.parse(savedGeneratedTask);
        setGeneratedTask(task);
        console.log('✨ ローカルストレージから最新タスクを復元');
      }
    } catch (error) {
      console.error('❌ ローカルストレージ読み込みエラー:', error);
    }
  }, []);

  // ローカルストレージにデータを保存
  const saveToLocalStorage = useCallback((key: string, data: any) => {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
      console.log(`💾 ローカルストレージに保存: ${key}`, data);
    } catch (error) {
      console.error('❌ ローカルストレージ保存エラー:', error);
    }
  }, []);
  const requestNotificationPermission = useCallback(async () => {
    console.log('🔔 通知許可リクエスト開始');
    console.log('👤 現在のユーザー状態:', user);
    
    // ユーザーが設定されるまで少し待つ
    if (!user) {
      console.log('⏳ ユーザー設定を待機中...');
      // 最大3秒待機してユーザーが設定されるか確認
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (user) break;
      }
    }
    
    const currentUser = user;
    console.log('👤 最終的なユーザー:', currentUser);
    
    if (!currentUser) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }
    
    try {
      console.log('📱 通知サービスに許可リクエスト中...');
      const granted = await notificationService.requestPermission(currentUser.uid);
      console.log('✅ 通知許可結果:', granted);
      
      if (granted) {
        console.log('💾 Firestoreにユーザー登録中...');
        // ユーザーをFirestoreに登録（通知有効化フラグ付き）
        const registerResult = await firestoreService.registerUser(currentUser.uid);
        console.log('👤 ユーザー登録結果:', registerResult);
        
        console.log('✅ 通知許可完了');
      }
    } catch (error) {
      console.error('❌ 通知許可エラー:', error);
    }
  }, [user]); // userを依存配列に追加

  // ユーザーデータの読み込み
  const loadUserData = useCallback(async (userId: string) => {
    try {
      console.log('📊 ユーザーデータを読み込み中...');
      setDataLoaded(false);
      
      // タスク履歴を読み込み
      const tasks = await firestoreService.getUserTasks(userId, 20);
      setTasks(tasks);
      saveToLocalStorage('gemiyou-tasks', tasks);
      console.log('📋 タスク履歴:', tasks.length, '件');
      
      // 最新のタスクを generatedTask として設定
      if (tasks.length > 0) {
        setGeneratedTask(tasks[0]);
        saveToLocalStorage('gemiyou-generated-task', tasks[0]);
        console.log('✨ 最新タスクを設定:', tasks[0].content.substring(0, 50) + '...');
      }
      
      // 回答履歴を読み込み
      const responses = await firestoreService.getUserResponses(userId, 20);
      console.log('📝 回答履歴:', responses.length, '件');
      
      // 統計情報を読み込み（既存の統計を保持）
      const currentStats = userStats;
      const newStats = await firestoreService.getUserStats(userId);
      console.log('📊 Firestoreから取得した統計:', newStats);
      console.log('📊 現在の統計:', currentStats);
      
      // Firestoreの統計が空の場合は現在の統計を保持
      if (newStats.totalTasks === 0 && newStats.completedToday === 0 && newStats.totalScore === 0) {
        if (currentStats.totalTasks > 0 || currentStats.completedToday > 0 || currentStats.totalScore > 0) {
          console.log('⚠️ Firestoreの統計が空のため、現在の統計を保持します');
          setDataLoaded(true);
          return;
        }
      }
      
      setUserStats(newStats);
      saveToLocalStorage('gemiyou-stats', newStats);
      console.log('📊 統計をローカルストレージに保存完了');
      
      setDataLoaded(true);
      
    } catch (error) {
      console.error('❌ ユーザーデータ読み込みエラー:', error);
      // エラー時はローカルストレージから読み込み
      console.log('🔄 エラーのためローカルストレージから復元');
      loadFromLocalStorage();
    }
  }, [saveToLocalStorage, loadFromLocalStorage, userStats]);

  useEffect(() => {
    // Firebase認証の初期化
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // 匿名ログインを試行
        try {
          await signInAnonymously(auth);
        } catch (error) {
          // テストユーザーを設定
          const testUser = {
            uid: 'user-' + Date.now(),
            isAnonymous: true,
            providerData: [],
            metadata: {},
            refreshToken: '',
            tenantId: null,
            delete: async () => {},
            getIdToken: async () => 'test-token',
            getIdTokenResult: async () => ({} as any),
            reload: async () => {},
            toJSON: () => ({})
          } as any;
          setUser(testUser);
          // テストユーザーもFirestoreに登録
          await firestoreService.registerUser(testUser.uid);
          // Firestoreからデータを読み込み（ローカルデータは既に読み込み済み）
          setTimeout(() => loadUserData(testUser.uid), 1000);
        }
      } else {
        // ユーザーをFirestoreに登録
        await firestoreService.registerUser(user.uid);
        // Firestoreからデータを読み込み（ローカルデータは既に読み込み済み）
        setTimeout(() => loadUserData(user.uid), 1000);
      }
    });

    return () => unsubscribe();
  }, [loadFromLocalStorage, loadUserData]); // 依存配列を更新

  const difficultyOptions = useMemo(() => ['beginner', 'intermediate', 'advanced'], []);

  const handleGenerateTask = useCallback(async (difficulty?: string) => {
    if (!user) return;

    setTaskGenerating(true);
    
    try {
      // 難易度が指定されていない場合はランダム選択
      const selectedDifficulty = difficulty || 
        difficultyOptions[Math.floor(Math.random() * difficultyOptions.length)];
      
      console.log('🎲 手動タスク生成開始:', selectedDifficulty);
      const task = await geminiService.generateTaskWithCloudFunction(user.uid, selectedDifficulty);
      console.log('✅ タスク生成完了:', task);
      
      setGeneratedTask(task);
      saveToLocalStorage('gemiyou-generated-task', task);
      
      const newTasks = [task, ...tasks.slice(0, 9)]; // 最新10件を保持
      setTasks(newTasks);
      saveToLocalStorage('gemiyou-tasks', newTasks);
      
      // ローカル統計を即座に更新（UI反応性向上）
      console.log('📊 ローカル統計を即座に更新');
      setUserStats((prev: any) => {
        const updatedStats = {
          ...prev,
          totalTasks: prev.totalTasks + 1
        };
        console.log('📊 新しい統計:', updatedStats);
        saveToLocalStorage('gemiyou-stats', updatedStats);
        return updatedStats;
      });
      
      // 通知を送信
      await notificationService.notifyNewTask(
        task.aiPersonality?.name || 'AI',
        task.content
      );
      
      // 少し待ってからFirestoreから正確な統計を再取得（Cloud Functionsでの保存完了を待つ）
      setTimeout(async () => {
        try {
          console.log('📊 手動生成後の統計更新中...');
          
          // Firestoreから最新のタスクリストを取得
          const latestTasks = await firestoreService.getUserTasks(user.uid, 20);
          setTasks(latestTasks);
          saveToLocalStorage('gemiyou-tasks', latestTasks);
          
          // 統計情報を更新
          const updatedStats = await firestoreService.getUserStats(user.uid);
          console.log('📊 Firestoreから更新された統計:', updatedStats);
          setUserStats(updatedStats);
          saveToLocalStorage('gemiyou-stats', updatedStats);
        } catch (error) {
          console.error('📊 統計更新エラー:', error);
        }
      }, 3000); // 3秒後に実行（長めに設定）
      
    } catch (error) {
      console.error('❌ タスク生成エラー:', error);
      alert('タスクの生成に失敗しました。しばらく後でお試しください。');
    } finally {
      setTaskGenerating(false);
    }
  }, [user, difficultyOptions, tasks, saveToLocalStorage]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleCloseTaskDetail = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // 新しいタスクの定期チェック
  useEffect(() => {
    if (!user) return;

    let lastCheckTime = Date.now();
    let isChecking = false;

    const checkForNewTasks = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        console.log('📋 新しいタスクをチェック中...');
        
        // 最新のタスクを取得
        const latestTasks = await firestoreService.getUserTasks(user.uid, 5);
        console.log('📋 取得したタスク数:', latestTasks.length);
        
        // 前回チェック以降に作成されたタスクがあるかチェック
        const newTasks = latestTasks.filter(task => {
          const taskTime = task.createdAt?.seconds * 1000 || 0;
          return taskTime > lastCheckTime;
        });
        
        console.log('🆕 新しいタスク数:', newTasks.length);
        
        if (newTasks.length > 0) {
          // 最新のタスクについて通知
          const newestTask = newTasks[0];
          console.log('🔔 通知送信中:', newestTask);
          
          // ローカル通知を送信
          await notificationService.notifyNewTask(
            newestTask.aiPersonality?.name || 'AI Assistant',
            newestTask.content
          );
          
          // タスク一覧を更新
          setTasks(latestTasks);
          saveToLocalStorage('gemiyou-tasks', latestTasks);
          
          // 最新のタスクをgeneratedTaskとして設定
          setGeneratedTask(newestTask);
          saveToLocalStorage('gemiyou-generated-task', newestTask);
          console.log('✨ 新しいタスクを設定:', newestTask.content.substring(0, 50) + '...');
          
          // 統計も更新
          const updatedStats = await firestoreService.getUserStats(user.uid);
          setUserStats(updatedStats);
          saveToLocalStorage('gemiyou-stats', updatedStats);
          console.log('📊 自動生成後の統計更新:', updatedStats);
        }
        
        lastCheckTime = Date.now();
      } catch (error) {
        console.error('❌ タスクチェックエラー:', error);
      } finally {
        isChecking = false;
      }
    };

    // 初回チェック（10秒後）
    const initialTimeout = setTimeout(() => {
      checkForNewTasks();
    }, 10000);

    // 60秒ごとに新しいタスクをチェック（頻度を下げる）
    const interval = setInterval(checkForNewTasks, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, saveToLocalStorage]);

  useEffect(() => {
    if (user && dataLoaded) {
      // ユーザーデータが既に読み込み済みの場合は再読み込みしない
      console.log('📊 データは既に読み込み済み');
      return;
    }
    
    if (user) {
      // ローカルストレージから統計があるかチェック
      const savedStats = localStorage.getItem('gemiyou-stats');
      if (savedStats) {
        try {
          const stats = JSON.parse(savedStats);
          if (stats.totalTasks > 0 || stats.completedToday > 0 || stats.totalScore > 0) {
            console.log('📊 有効な統計がローカルストレージにあるため、Firestore同期をスキップ');
            setDataLoaded(true);
            return;
          }
        } catch (error) {
          console.error('統計データ解析エラー:', error);
        }
      }
      
      // ユーザーデータを読み込み
      loadUserData(user.uid);
    }
  }, [user, loadUserData, dataLoaded]);

  if (loading) {
    return (
      <div className="app-container">
        <h1 className="app-title">🧠 Gemiyou</h1>
        <div className="loading-spinner">
          <p>🔄 アプリケーションを起動中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onBack={handleCloseTaskDetail}
          onTaskUpdate={async (updatedTask) => {
            // Firestoreにタスク回答を保存
            if (user && updatedTask.userResponse && updatedTask.evaluation) {
              console.log('💾 回答をFirestoreに保存中...');
              await firestoreService.saveTaskResponse(
                updatedTask.id,
                user.uid,
                updatedTask.userResponse,
                updatedTask.evaluation
              );
              
              // 統計情報を更新
              console.log('📊 回答保存後の統計更新中...');
              const newStats = await firestoreService.getUserStats(user.uid);
              console.log('📊 回答保存後の新しい統計:', newStats);
              setUserStats(newStats);
              saveToLocalStorage('gemiyou-stats', newStats);
            }
            
            // タスクリストを更新
            const updatedTasks = tasks.map(task => 
              task.id === updatedTask.id ? updatedTask : task
            );
            setTasks(updatedTasks);
            saveToLocalStorage('gemiyou-tasks', updatedTasks);
            
            // 選択中のタスクも更新
            setSelectedTask(updatedTask);
            
            // 最新タスクの場合はgeneratedTaskも更新
            if (generatedTask?.id === updatedTask.id) {
              setGeneratedTask(updatedTask);
              saveToLocalStorage('gemiyou-generated-task', updatedTask);
            }
          }}
        />
      )}
      
      <header className="app-header">
        <h1 className="app-title">🧠 Gemiyou</h1>
        <p className="app-subtitle">あなたがAIのタスクをするサービス</p>
        {user ? (
          <>
            {/* ユーザー統計 */}
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-value">{userStats?.totalTasks || 0}</span>
                <span className="stat-label">生成済みタスク</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats?.completedToday || 0}</span>
                <span className="stat-label">今日の完了</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{userStats?.totalScore || 0}</span>
                <span className="stat-label">合計点数</span>
              </div>
            </div>
            
            <button 
              onClick={requestNotificationPermission}
              className="notification-button"
            >
              🔔 通知を有効にする
            </button>
          </>
        ) : (
          <p>ユーザー設定中...</p>
        )}
      </header>

      <main className="main-content">
        {/* タスク生成セクション */}
        <section className="task-generation-section">
          <h2>🎲 新しいタスクを生成</h2>
          
          <div className="difficulty-selection">
            <h3>難易度を選択:</h3>
            <div className="difficulty-buttons">
              <button
                className="difficulty-button beginner"
                onClick={() => handleGenerateTask('beginner')}
                disabled={taskGenerating}
              >
                🌱 初級
              </button>
              <button
                className="difficulty-button intermediate"
                onClick={() => handleGenerateTask('intermediate')}
                disabled={taskGenerating}
              >
                🌿 中級
              </button>
              <button
                className="difficulty-button advanced"
                onClick={() => handleGenerateTask('advanced')}
                disabled={taskGenerating}
              >
                🌳 上級
              </button>
            </div>
          </div>
          
          <button 
            className="generate-button random"
            onClick={() => handleGenerateTask()}
            disabled={taskGenerating}
          >
            {taskGenerating ? '⏳ 生成中...' : '🎲 ランダムタスクを生成'}
          </button>
        </section>

        {/* 最新生成タスク */}
        {generatedTask && (
          <section className="current-task-section">
            <h2>✨ 最新のタスク</h2>
            <div 
              className="task-card current-task clickable"
              onClick={() => handleTaskClick(generatedTask)}
            >
              <div className="task-header">
                <h3>{generatedTask.aiPersonality?.name || 'AI'}</h3>
                <span className="difficulty">{generatedTask.difficulty}</span>
              </div>
              <div className="task-content">
                <p><strong>タスク:</strong> {generatedTask.content}</p>
                {generatedTask.hint && (
                  <p><strong>ヒント:</strong> {generatedTask.hint}</p>
                )}
                {generatedTask.expectation && (
                  <p><strong>期待:</strong> {generatedTask.expectation}</p>
                )}
              </div>
              <div className="task-footer">
                <small>生成日時: {
                  (() => {
                    try {
                      const createdAt = generatedTask.createdAt as any;
                      if (createdAt?.toDate) {
                        return createdAt.toDate().toLocaleString('ja-JP');
                      } else if (createdAt?.seconds) {
                        return new Date(createdAt.seconds * 1000).toLocaleString('ja-JP');
                      } else if (createdAt instanceof Date) {
                        return createdAt.toLocaleString('ja-JP');
                      } else {
                        return new Date(createdAt).toLocaleString('ja-JP');
                      }
                    } catch (error) {
                      return '不明';
                    }
                  })()
                }</small>
                <small className="click-hint">💬 クリックして対話</small>
              </div>
            </div>
          </section>
        )}

        {/* タスク履歴 */}
        {tasks.length > 0 && (
          <section className="task-history-section">
            <h2>📚 過去のタスク</h2>
            <div className="task-list">
              {tasks.filter(task => task.id !== generatedTask?.id).map((task, index) => (
                <div 
                  key={task.id || index} 
                  className="task-card history-task clickable"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="task-header">
                    <h4>{task.aiPersonality?.name || 'AI'}</h4>
                    <span className="difficulty">{task.difficulty}</span>
                  </div>
                  <div className="task-content">
                    <p>{task.content}</p>
                  </div>
                  <div className="task-footer">
                    <small>{
                      (() => {
                        try {
                          const createdAt = task.createdAt as any;
                          if (createdAt?.toDate) {
                            return createdAt.toDate().toLocaleString('ja-JP');
                          } else if (createdAt?.seconds) {
                            return new Date(createdAt.seconds * 1000).toLocaleString('ja-JP');
                          } else if (createdAt instanceof Date) {
                            return createdAt.toLocaleString('ja-JP');
                          } else {
                            return new Date(createdAt).toLocaleString('ja-JP');
                          }
                        } catch (error) {
                          return '不明';
                        }
                      })()
                    }</small>
                    <small className="click-hint">💬 クリックして対話</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* フッター情報 */}
        <footer className="app-footer">
          <p>👤 ユーザー: {user?.uid?.substring(0, 8)}... | 
             💾 生成済みタスク数: {tasks.length}</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
