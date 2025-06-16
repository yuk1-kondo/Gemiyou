import React, { useState, useEffect } from 'react';
import './App.css';
import { auth } from './firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { geminiService } from './services/geminiService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskGenerating, setTaskGenerating] = useState(false);
  const [generatedTask, setGeneratedTask] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    console.log('🚀 Chatヒューマン アプリケーション起動');
    
    // Firebase認証の初期化
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 認証状態:', user ? `ユーザー: ${user.uid}` : '未認証');
      setUser(user);
      setLoading(false);
      
      if (!user) {
        // 匿名ログインを試行
        signInAnonymously(auth)
          .then((result) => {
            console.log('✅ 匿名ログイン成功:', result.user.uid);
          })
          .catch((error) => {
            console.warn('⚠️ Firebase認証をスキップしてテストモードで続行');
            // テストユーザーを設定
            setUser({
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
            } as any);
          });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGenerateTask = async () => {
    if (!user) return;

    setTaskGenerating(true);
    
    try {
      console.log('🎲 新しいタスクを生成中...');
      const task = await geminiService.generateTaskWithCloudFunction(user.uid, 'beginner');
      console.log('✅ タスク生成成功:', task);
      
      setGeneratedTask(task);
      setTasks(prev => [task, ...prev.slice(0, 9)]); // 最新10件を保持
      
    } catch (error) {
      console.error('❌ タスク生成エラー:', error);
      alert('タスクの生成に失敗しました。しばらく後でお試しください。');
    } finally {
      setTaskGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <h1 className="app-title">🧠 Chatヒューマン</h1>
        <div className="loading-spinner">
          <p>🔄 アプリケーションを起動中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🧠 Chatヒューマン</h1>
        <p className="app-subtitle">AIがあなたに創造的なタスクを提案します</p>
      </header>

      <main className="main-content">
        {/* タスク生成セクション */}
        <section className="task-generation-section">
          <h2>🎲 新しいタスクを生成</h2>
          <button 
            className="generate-button"
            onClick={handleGenerateTask}
            disabled={taskGenerating}
          >
            {taskGenerating ? '⏳ 生成中...' : '🎲 新しいタスクを生成'}
          </button>
        </section>

        {/* 最新生成タスク */}
        {generatedTask && (
          <section className="current-task-section">
            <h2>✨ 最新のタスク</h2>
            <div className="task-card current-task">
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
                <small>生成日時: {new Date(generatedTask.createdAt).toLocaleString('ja-JP')}</small>
              </div>
            </div>
          </section>
        )}

        {/* タスク履歴 */}
        {tasks.length > 0 && (
          <section className="task-history-section">
            <h2>📚 過去のタスク</h2>
            <div className="task-list">
              {tasks.slice(1).map((task, index) => (
                <div key={task.id || index} className="task-card history-task">
                  <div className="task-header">
                    <h4>{task.aiPersonality?.name || 'AI'}</h4>
                    <span className="difficulty">{task.difficulty}</span>
                  </div>
                  <div className="task-content">
                    <p>{task.content}</p>
                  </div>
                  <div className="task-footer">
                    <small>{new Date(task.createdAt).toLocaleString('ja-JP')}</small>
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
