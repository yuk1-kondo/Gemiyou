import { useState, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { Task } from '../types';
import './TaskDetail.css';

interface TaskDetailProps {
  task: Task;
  onBack: () => void;
  onTaskUpdate: (updatedTask: Task) => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onBack, onTaskUpdate }) => {
  const [response, setResponse] = useState(task.userResponse || '');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleResponseChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResponse(e.target.value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!response.trim()) {
      alert('回答を入力してください。');
      return;
    }

    if (!task.id) {
      alert('エラー: タスクIDが設定されていません。');
      return;
    }

    setIsEvaluating(true);
    
    try {
      const evaluation = await geminiService.evaluateResponse(task.id, response);

      const updatedTask = {
        ...task,
        userResponse: response,
        evaluation: {
          score: evaluation.score,
          feedback: evaluation.feedback,
          encouragement: evaluation.encouragement,
          attitude: evaluation.breakdown?.attitude,
          content: evaluation.breakdown?.content,
          creativity: evaluation.breakdown?.creativity
        }
      };

      onTaskUpdate(updatedTask);
      
    } catch (error) {
      console.error('❌ [TaskDetail] 評価エラー:', error);
      alert('評価中にエラーが発生しました。しばらく後に再試行してください。');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="task-detail">
      {/* ヘッダー */}
      <div className="task-detail-header">
        <button onClick={onBack} className="back-button">
          ← タスク一覧に戻る
        </button>
        <h1 className="task-detail-title">タスク詳細</h1>
        <div></div> {/* スペーサー */}
      </div>
      
      {/* メインコンテンツ */}
      <div className="task-detail-content">
        {/* タスク情報セクション */}
        <div className="task-info-section">
          <div className="task-meta">
            <div className="meta-badge genre-badge">
              <span className="meta-label">ジャンル</span>
              <span className="meta-value">{task.aiPersonality?.name || task.genre || 'AI'}</span>
            </div>
            <div className="meta-badge difficulty-badge">
              <span className="meta-label">難易度</span>
              <span className="meta-value">{task.difficulty}</span>
            </div>
          </div>
          
          <div className="question-card">
            <h3 className="question-title">💭 あなたへの質問</h3>
            <div className="question-content">
              <p>{task.content || task.question}</p>
            </div>
          </div>
        </div>

        {/* 回答入力セクション */}
        <div className="response-section">
          <form onSubmit={handleSubmit} className="response-form">
            <h3 className="response-title">✍️ あなたの回答</h3>
            <div className="form-group">
              <textarea
                id="response"
                value={response}
                onChange={handleResponseChange}
                placeholder="ここに回答を入力してください...&#10;&#10;💡 ヒント: 具体的で詳しい回答ほど高評価が得られます！"
                rows={8}
                disabled={isEvaluating}
                className="response-textarea"
              />
            </div>
            
            <button 
              type="submit" 
              className={`submit-button ${isEvaluating ? 'evaluating' : ''}`}
              disabled={isEvaluating || !response.trim()}
            >
              {isEvaluating ? (
                <span className="loading-text">
                  🤖 AI評価中... 
                  <span className="loading-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </span>
              ) : (
                '🚀 回答を評価する'
              )}
            </button>
          </form>
        </div>

        {/* 評価結果セクション */}
        {task.evaluation && (
          <div className="evaluation-section">
            <h3 className="evaluation-title">🎯 AI評価結果</h3>
            
            {/* スコア表示 */}
            <div className="score-display-card">
              <div className="main-score">
                <div className="score-circle">
                  <span className="score-number">{Math.floor(Number(task.evaluation.score) || 0)}</span>
                  <span className="score-suffix">点</span>
                </div>
                <div className="score-label">総合スコア</div>
                <div className="score-grade">
                  {(() => {
                    const score = Math.floor(Number(task.evaluation.score) || 0);
                    if (score >= 90) return '🏆 素晴らしい！';
                    if (score >= 80) return '🌟 とても良い';
                    if (score >= 70) return '👍 良い';
                    if (score >= 60) return '📈 もう少し';
                    return '💪 頑張ろう';
                  })()}
                </div>
              </div>
              
              {/* 項目別スコア - 非表示 */}
            </div>
            
            {/* フィードバック */}
            <div className="feedback-card">
              <h4 className="feedback-title">💬 詳細フィードバック</h4>
              <div className="feedback-content">
                <p>{task.evaluation.feedback}</p>
              </div>
              
              {task.evaluation.encouragement && (
                <div className="encouragement-card">
                  <h5 className="encouragement-title">🌟 励ましのメッセージ</h5>
                  <div className="encouragement-content">
                    <p>{task.evaluation.encouragement}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;
