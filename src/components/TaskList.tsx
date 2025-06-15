import React from 'react';
import { Task } from '../services/firestoreService';
import { EnhancedTask } from '../services/geminiService';
import './TaskList.css';

interface TaskListProps {
  tasks: (Task | EnhancedTask)[];
  onTaskSelect: (task: Task | EnhancedTask) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskSelect }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isEnhancedTask = (task: Task | EnhancedTask): task is EnhancedTask => {
    return 'aiPersonality' in task;
  };

  const getStatusBadge = (task: Task | EnhancedTask) => {
    // Enhanced Task チェック
    if (isEnhancedTask(task) && task.isCompleted) {
      return <span className="status-badge status-completed">✅ 完了</span>;
    }
    
    if (isEnhancedTask(task) && task.attempts > 0) {
      const attempts = task.attempts;
      return <span className="status-badge status-in-progress">💬 {attempts}回目</span>;
    }
    
    if (!isEnhancedTask(task)) {
      if (!task.userResponse) {
        return <span className="status-badge status-pending">💭 新着メッセージ</span>;
      } else if (!task.evaluated) {
        return <span className="status-badge status-completed">📝 回答済み</span>;
      } else {
        return <span className="status-badge status-evaluated">⭐ 評価済み</span>;
      }
    } else {
      return <span className="status-badge status-pending">💭 新着メッセージ</span>;
    }
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

  const getPersonality = (task: Task | EnhancedTask) => {
    return isEnhancedTask(task) ? task.aiPersonality : task.personality;
  };

  const getScore = (task: Task | EnhancedTask) => {
    if (isEnhancedTask(task)) {
      return task.totalScore;
    } else {
      return task.score;
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="task-list">
        <div className="task-list-empty">
          <h3>💬 最初の会話を始めましょう</h3>
          <p>「新しいAI依頼を生成」ボタンを押して、AIからの最初のメッセージを受け取りましょう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list">
      <h2>💬 AIとの会話</h2>
      
      <div className="task-cards">
        {tasks.map((task) => {
          const personality = getPersonality(task);
          const score = getScore(task);
          
          return (
            <div 
              key={task.id} 
              className="task-card"
              onClick={() => onTaskSelect(task)}
            >
              <div className="task-header">
                <div className="ai-personality">
                  <div className={`ai-avatar ${personality.type.toLowerCase()}`}>
                    {getAIEmoji(personality.type)}
                  </div>
                  <div className="ai-info">
                    <h3>{personality.name}</h3>
                    <span className="ai-type">{personality.type}</span>
                  </div>
                </div>
                <div className="task-status">
                  {getStatusBadge(task)}
                </div>
              </div>
              
              <div className="task-content">
                <p className="task-request">{task.requestText}</p>
              </div>
              
              <div className="task-footer">
                <span className="task-meta">{formatDate(task.createdAt)}</span>
                {score && score > 0 && (
                  <div className="task-score">
                    ⭐ {score}点
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskList;
