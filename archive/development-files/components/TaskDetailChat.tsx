import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../services/firestoreService';
import { geminiService, ChatMessage, ChatEvaluation, EnhancedTask } from '../services/geminiService';
import './TaskDetail.css';

interface TaskDetailProps {
  task: Task | EnhancedTask;
  onClose: () => void;
  userId: string;
}

const TaskDetailChat: React.FC<TaskDetailProps> = ({ task, onClose, userId }) => {
  const [currentInput, setCurrentInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャット履歴の初期化
  useEffect(() => {
    if ('chatHistory' in task && task.chatHistory) {
      setChatHistory(task.chatHistory);
      setIsCompleted(task.isCompleted || false);
      setCurrentScore(task.totalScore || 0);
      setAttempts(task.attempts || 0);
    }
  }, [task]);

  // 自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async () => {
    if (!currentInput.trim()) {
      alert('メッセージを入力してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      // ユーザーメッセージを追加
      const userMessage: ChatMessage = {
        sender: 'user',
        content: currentInput,
        timestamp: new Date()
      };

      const newChatHistory = [...chatHistory, userMessage];
      setChatHistory(newChatHistory);
      setCurrentInput('');
      setAttempts(prev => prev + 1);

      // テストモードの場合はローカル評価
      if (userId.startsWith('test-user-')) {
        console.log('🧪 テストモード: ローカルチャット評価');
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const randomScore = Math.floor(Math.random() * 41) + 60; // 60-100点
        const passingScore = (task as EnhancedTask).aiPersonality?.passingScore || 75;
        const passed = randomScore >= passingScore;
        
        const testFeedback = passed 
          ? 'よくできました！合格です！'
          : `もう少しです。あと${passingScore - randomScore}点必要です。具体的な例を追加してみてください。`;

        const aiResponse = passed ? undefined : 'もう一度挑戦してみてください。より詳しく説明していただけますか？';

        const evaluation: ChatEvaluation = {
          score: randomScore,
          passed,
          feedback: testFeedback,
          nextAction: passed ? 'complete' : 'continue',
          aiResponse,
          improvementPoints: passed ? [] : ['より具体的に', '例を追加']
        };

        userMessage.evaluation = evaluation;
        setCurrentScore(randomScore);

        if (!passed && aiResponse) {
          const aiMessage: ChatMessage = {
            sender: 'ai',
            content: aiResponse,
            timestamp: new Date()
          };
          setChatHistory([...newChatHistory, aiMessage]);
        } else {
          setIsCompleted(true);
        }

      } else {
        // 通常モード: Cloud Functions で評価
        const evaluation = await geminiService.evaluateChatResponse(
          task.id,
          userId,
          currentInput,
          chatHistory
        );

        userMessage.evaluation = evaluation;
        setCurrentScore(evaluation.score);

        let finalHistory = [...newChatHistory];

        if (evaluation.nextAction === 'continue' && evaluation.aiResponse) {
          const aiMessage: ChatMessage = {
            sender: 'ai',
            content: evaluation.aiResponse,
            timestamp: new Date()
          };
          finalHistory = [...finalHistory, aiMessage];
        } else if (evaluation.passed) {
          setIsCompleted(true);
        }

        setChatHistory(finalHistory);
      }

    } catch (error) {
      console.error('チャット送信エラー:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
      case '哲学者': return '🤔';
      case 'エンジニア': return '⚙️';
      case '心理学者': return '🧠';
      case '起業家': return '💡';
      default: return '🤖';
    }
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return '#15722c'; // 緑
    if (score >= passingScore - 10) return '#fccc00'; // 黄
    return '#eb6100'; // 赤
  };

  const aiPersonality = 'aiPersonality' in task ? task.aiPersonality : task.personality;
  const passingScore = 'aiPersonality' in task ? task.aiPersonality.passingScore : 75;

  return (
    <div className="task-detail">
      <div className="task-detail-content">
        <div className="task-detail-header">
          <button className="close-btn" onClick={onClose}>
            ← 戻る
          </button>
          <div className="chat-header">
            <div className="ai-avatar">
              {getAIEmoji(aiPersonality.type)}
            </div>
            <div className="ai-info">
              <h3>{aiPersonality.name}</h3>
              <span className="ai-type">{aiPersonality.type}</span>
              {'strictness' in aiPersonality && (
                <span className="strictness">厳しさ: {aiPersonality.strictness}/10</span>
              )}
            </div>
          </div>
          <div className="task-stats">
            <div className="score-display" style={{ color: getScoreColor(currentScore, passingScore) }}>
              スコア: {currentScore}/{passingScore}
            </div>
            <div className="attempts-display">
              試行回数: {attempts}
            </div>
          </div>
        </div>

        <div className="chat-container">
          <div className="chat-messages">
            {/* AI の初回メッセージ */}
            <div className="message ai-message">
              <div className="message-avatar">
                {getAIEmoji(aiPersonality.type)}
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

            {/* チャット履歴 */}
            {chatHistory.map((message, index) => (
              <div key={index} className={`message ${message.sender}-message`}>
                {message.sender === 'ai' && (
                  <div className="message-avatar">
                    {getAIEmoji(aiPersonality.type)}
                  </div>
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    <div className="message-text">
                      {message.content}
                    </div>
                    <div className="message-time">
                      {formatDate(message.timestamp)}
                    </div>
                    {message.evaluation && (
                      <div className="evaluation-badge">
                        <span className="score" style={{ color: getScoreColor(message.evaluation.score, passingScore) }}>
                          {message.evaluation.score}点
                        </span>
                        {message.evaluation.passed && <span className="passed">✅ 合格!</span>}
                      </div>
                    )}
                  </div>
                  {message.evaluation && (
                    <div className="feedback">
                      <div className="feedback-header">
                        <strong>{aiPersonality.name}からの評価</strong>
                        {message.evaluation.attemptNumber && (
                          <span className="attempt-badge">{message.evaluation.attemptNumber}回目</span>
                        )}
                      </div>
                      
                      <p className="main-feedback">{message.evaluation.feedback}</p>
                      
                      {message.evaluation.detailedAnalysis && (
                        <div className="detailed-analysis">
                          <strong>専門的分析:</strong>
                          <p>{message.evaluation.detailedAnalysis}</p>
                        </div>
                      )}
                      
                      {message.evaluation.strengths && message.evaluation.strengths.length > 0 && (
                        <div className="strengths">
                          <strong>🎯 良い点:</strong>
                          <ul>
                            {message.evaluation.strengths.map((strength, i) => (
                              <li key={i} className="strength-item">{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {message.evaluation.improvementPoints && message.evaluation.improvementPoints.length > 0 && (
                        <div className="improvements">
                          <strong>📈 改善点:</strong>
                          <ul>
                            {message.evaluation.improvementPoints.map((point, i) => (
                              <li key={i} className="improvement-item">{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <div className="message-avatar">
                    👤
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* 入力フォーム */}
          {!isCompleted && (
            <div className="chat-input-section">
              <div className="input-container">
                <textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="メッセージを入力..."
                  className="chat-input"
                  disabled={isSubmitting}
                  rows={3}
                />
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !currentInput.trim()}
                  className="send-btn"
                >
                  {isSubmitting ? '送信中...' : '送信'}
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="completion-message">
              <h3>🎉 タスク完了！</h3>
              <p>最終スコア: {currentScore}点</p>
              <p>試行回数: {attempts}回</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailChat;
