import React, { useState } from 'react';
import { Task } from '../services/firestoreService';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import './TaskDetail.css';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  userId: string;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose, userId }) => {
  const [userResponse, setUserResponse] = useState(task.userResponse || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleSubmit = async () => {
    if (!userResponse.trim()) {
      alert('回答を入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      // テストモードの場合はローカルで評価を生成
      if (userId.startsWith('test-user-')) {
        console.log('🧪 テストモード: ローカル評価生成');
        
        setIsEvaluating(true);
        
        // テスト用の評価を生成
        const testFeedbacks = [
          '素晴らしい回答です！あなたの視点はとても興味深く、深く考えられていることが伝わってきます。',
          '良い気づきですね。この経験から学んだことを今後に活かしていけそうです。',
          'とても誠実な回答をありがとうございます。あなたの素直な気持ちが伝わってきました。',
          '創造的なアプローチが素晴らしいです！新しい視点を提供してくれました。',
          '論理的で整理された回答です。段階的に考えを進めている姿勢が素晴らしいです。'
        ];
        
        const randomFeedback = testFeedbacks[Math.floor(Math.random() * testFeedbacks.length)];
        const randomScore = Math.floor(Math.random() * 21) + 80; // 80-100点
        
        // 少し待機（リアルな体験のため）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // タスクを更新
        task.userResponse = userResponse;
        task.feedbackText = randomFeedback;
        task.score = randomScore;
        task.evaluated = true;
        
        alert(`評価が完了しました！\n\nスコア: ${randomScore}点\n\n${randomFeedback}`);
        
      } else {
        // 通常モード: Firestore に回答を保存
        await firestoreService.updateTaskResponse(userId, task.id, userResponse);
        
        // 評価を生成
        setIsEvaluating(true);
        const evaluation = await geminiService.evaluateResponse(
          task.personality,
          task.requestText,
          userResponse
        );
        
        // 評価をFirestoreに保存
        await firestoreService.updateTaskEvaluation(
          userId,
          task.id,
          evaluation.feedback,
          evaluation.score
        );
        
        // タスクを更新
        task.userResponse = userResponse;
        task.feedbackText = evaluation.feedback;
        task.score = evaluation.score;
        task.evaluated = true;
        
        alert(`評価が完了しました！\n\nスコア: ${evaluation.score}点\n\n${evaluation.feedback}`);
      }
      
    } catch (error) {
      console.error('回答送信エラー:', error);
      alert('回答の送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
      setIsEvaluating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getAIEmoji = (type: string) => {
    switch (type) {
      case 'タスクマスター': return '⚡';
      case 'クリエイター': return '🎨';
      case 'アナリスト': return '📊';
      case 'コーチ': return '🌟';
      default: return '🤖';
    }
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🌟';
    if (score >= 80) return '✨';
    if (score >= 70) return '👍';
    if (score >= 60) return '👌';
    return '💪';
  };

  return (
    <div className="task-detail">
      <div className="task-detail-content">
        <div className="task-detail-header">
          <button className="close-btn" onClick={onClose}>
            ← 戻る
          </button>
          <div className="chat-header">
            <div className="ai-avatar">
              {getAIEmoji(task.personality.type)}
            </div>
            <div className="ai-info">
              <h3>{task.personality.name}</h3>
              <span className="ai-type">{task.personality.type}</span>
            </div>
          </div>
        </div>

      <div className="chat-container">
        <div className="chat-messages">
          {/* AI の初回メッセージ */}
          <div className="message ai-message">
            <div className="message-avatar">
              {getAIEmoji(task.personality.type)}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                <div className="message-text">
                  {task.requestText}
                </div>
                <div className="message-time">
                  {formatDate(task.createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* ユーザーの回答 */}
          {task.userResponse && (
            <div className="message user-message">
              <div className="message-content">
                <div className="message-bubble">
                  <div className="message-text">
                    {task.userResponse}
                  </div>
                  <div className="message-time">
                    {task.respondedAt && formatDate(task.respondedAt)}
                  </div>
                </div>
              </div>
              <div className="message-avatar">
                👤
              </div>
            </div>
          )}

          {/* AI の評価フィードバック */}
          {task.evaluated && task.feedbackText && (
            <div className="message ai-message">
              <div className="message-avatar">
                {getAIEmoji(task.personality.type)}
              </div>
              <div className="message-content">
                <div className="message-bubble evaluation-bubble">
                  {task.score !== undefined && (
                    <div className="score-section">
                      <div className="score-display">
                        <span className="score-emoji">{getScoreEmoji(task.score)}</span>
                        <span className="score-value">{task.score}</span>
                        <span className="score-label">点</span>
                      </div>
                    </div>
                  )}
                  <div className="message-text">
                    {task.feedbackText}
                  </div>
                  <div className="message-time">
                    {task.evaluatedAt && formatDate(task.evaluatedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 回答入力フォーム */}
        {!task.userResponse && (
          <div className="chat-input-section">
            <div className="input-container">
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="メッセージを入力..."
                className="chat-input"
                disabled={isSubmitting}
                rows={3}
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isEvaluating || !userResponse.trim()}
                className="send-btn"
              >
                {isEvaluating 
                  ? '🧠 評価中...' 
                  : isSubmitting 
                    ? '送信中...' 
                    : '送信'
                }
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default TaskDetail;
