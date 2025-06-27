import { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { firestoreService } from '../services/firestoreService';
import { auth } from '../firebase';
import './TaskGenerator.css';

const TaskGenerator = ({ user }) => {
  // 難易度を日本語に変換する関数
  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '初級';
      case 'intermediate': return '中級';
      case 'advanced': return '上級';
      default: return difficulty;
    }
  };
  
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [userStats, setUserStats] = useState({ totalTasks: 0, completedToday: 0, totalScore: 0 });
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (user) {
        const stats = await firestoreService.getUserStats(user.uid);
        setUserStats(stats);
      }
    };
    loadStats();
  }, [user]);

  const refreshUserStats = async () => {
    if (user) {
      const stats = await firestoreService.getUserStats(user.uid);
      setUserStats(stats);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('ログアウトしますか？')) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error('ログアウトエラー:', error);
        alert('ログアウトに失敗しました');
      }
    }
  };

  const generateTask = async (difficulty = selectedDifficulty) => {
    setIsGenerating(true);
    try {
      const task = await geminiService.generateTaskWithCloudFunction(user?.uid, difficulty);
      
      // Cloud Functionsからのレスポンス形式に合わせて調整
      const processedTask = {
        id: task.id,
        title: `${task.aiPersonality || 'AI'}からの依頼`,
        description: task.content || '',
        requirements: task.hint ? [task.hint] : (task.expectation ? [task.expectation] : []),
        difficulty: task.difficulty || difficulty,
        genre: task.aiPersonalityType || 'AI', // 専門領域をメインラベルとして表示
        aiPersonality: task.aiPersonality, // 名前をタイトルで使用
        expectation: task.expectation,
        originalTask: task // 元のタスクデータも保持
      };
      
      setCurrentTask(processedTask);
      setResponse('');
    } catch (error) {
      console.error('タスク生成エラー:', error);
      alert('タスク生成に失敗しました: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitResponse = async () => {
    if (!currentTask || !response.trim()) return;

    setIsSubmitting(true);
    try {
      // サービスの存在チェック
      if (!firestoreService) {
        throw new Error('firestoreService が初期化されていません');
      }
      
      if (!firestoreService.saveTaskResponse) {
        throw new Error('firestoreService.saveTaskResponse メソッドが存在しません');
      }
      
      if (!geminiService) {
        throw new Error('geminiService が初期化されていません');
      }
      
      if (!geminiService.evaluateResponse) {
        throw new Error('geminiService.evaluateResponse メソッドが存在しません');
      }
      
      // 正しいタスクIDを取得（Cloud Functionsから返されたもの）
      const taskId = currentTask.originalTask?.id || currentTask.id;
      
      // 回答を評価
      const evaluation = await geminiService.evaluateResponse(taskId, response);
      
      // Firestoreに保存
      const saved = await firestoreService.saveTaskResponse(
        taskId,
        user.uid,
        response,
        evaluation
      );

      if (saved) {
        alert(`評価完了！\nスコア: ${evaluation.score}点\n${evaluation.feedback}`);
        
        // 統計を更新
        await refreshUserStats();
        
        // タスクをクリア
        setCurrentTask(null);
        setResponse('');
      } else {
        alert('回答の保存に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('❌ 回答送信エラー:', error);
      console.error('❌ エラースタック:', error.stack);
      alert('回答の送信に失敗しました: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-generator">
      {/* Chat機能セクション */}
      <div className="chat-section">
        <div className="chat-header">
          <img src="/Gemiyou-logo.png" alt="Gemiyou" className="gemiyou-logo" />
        </div>
        <p className="chat-subtitle">AIからの依頼に、あなたのセンスでこたえよう</p>
      </div>

      {/* タスク生成セクション */}
      <div className="task-section">
        <div className="task-header">
          <h3>新しいタスクを生成</h3>
        </div>
        
        <div className="difficulty-section">
          <p>難易度を選択:</p>
          <div className="difficulty-buttons">
            <button 
              className={`difficulty-btn beginner ${selectedDifficulty === 'beginner' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDifficulty('beginner');
                generateTask('beginner');
              }}
              disabled={isGenerating}
            >
              初級
            </button>
            <button 
              className={`difficulty-btn intermediate ${selectedDifficulty === 'intermediate' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDifficulty('intermediate');
                generateTask('intermediate');
              }}
              disabled={isGenerating}
            >
              中級
            </button>
            <button 
              className={`difficulty-btn advanced ${selectedDifficulty === 'advanced' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDifficulty('advanced');
                generateTask('advanced');
              }}
              disabled={isGenerating}
            >
              上級
            </button>
          </div>
        </div>

        <button 
          className="random-task-btn"
          onClick={() => generateTask()}
          disabled={isGenerating}
        >
          {isGenerating ? 'タスク生成中...' : 'ランダムタスクを生成'}
        </button>
      </div>

      {/* 現在のタスク表示 */}
      {currentTask && (
        <div className="current-task">
          <h3>現在のタスク</h3>
          <div className="task-content">
            <div className="task-meta">
              <span className="task-genre">{currentTask.genre}</span>
              <span className="task-difficulty">{getDifficultyLabel(currentTask.difficulty)}</span>
            </div>
            <h4>{currentTask.title}</h4>
            <p>{currentTask.description}</p>
            {currentTask.requirements && currentTask.requirements.length > 0 && (
              <div className="requirements">
                <h5>💡 ヒント・要件:</h5>
                <ul>
                  {currentTask.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="response-section">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="ここにあなたの回答を入力してください..."
              rows={6}
            />
            <button 
              className="submit-btn"
              onClick={submitResponse}
              disabled={!response.trim() || isSubmitting}
            >
              {isSubmitting ? '送信中...' : '回答を送信'}
            </button>
          </div>
        </div>
      )}

      {/* ユーザー統計 */}
      <div className="user-stats">
        <div className="stats-row">
          <span>ユーザー: {user?.displayName || user?.email?.split('@')[0] || 'user-175...'}</span>
        </div>
        <div className="stats-row">
          <span>生成済みタスク数: {userStats.totalTasks}</span>
          <span className="separator">|</span>
          <span>累計得点: {userStats.totalScore}点</span>
        </div>
        <div className="stats-row">
          <span>今日の完了数: {userStats.completedToday}</span>
        </div>
      </div>

      {/* ログアウトボタン */}
      <div className="logout-section">
        <button 
          className="logout-btn"
          onClick={handleLogout}
        >
          ログアウト
        </button>
      </div>
    </div>
  );
};

export default TaskGenerator;
