import React, { useState } from 'react';
import './App.css';

// シンプルなタスクインターフェース
interface SimpleTask {
  id: string;
  title: string;
  content: string;
  aiName: string;
  completed: boolean;
}

function App() {
  const [tasks, setTasks] = useState<SimpleTask[]>([
    {
      id: '1',
      title: '今日の気持ちを詩で表現',
      content: '今日あなたが感じた気持ちを、短い詩で表現してください。季節感や色彩を入れると素敵ですね。',
      aiName: 'ポエム先生',
      completed: false
    },
    {
      id: '2', 
      title: '理想の一日を描く',
      content: 'もし時間とお金に制約がなかったら、どんな一日を過ごしたいですか？具体的に教えてください。',
      aiName: 'ドリーム博士',
      completed: false
    }
  ]);

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState('');

  const currentTask = tasks.find(task => task.id === currentTaskId);

  const handleTaskSelect = (taskId: string) => {
    setCurrentTaskId(taskId);
    setUserResponse('');
  };

  const handleBackToList = () => {
    setCurrentTaskId(null);
    setUserResponse('');
  };

  const handleSubmit = () => {
    if (currentTask && userResponse.trim()) {
      // タスクを完了にマーク
      setTasks(prev => prev.map(task => 
        task.id === currentTask.id 
          ? { ...task, completed: true }
          : task
      ));
      
      alert(`${currentTask.aiName}より：素晴らしい回答をありがとうございました！\n\n「${userResponse.substring(0, 50)}${userResponse.length > 50 ? '...' : ''}」\n\nとても良い表現ですね。次のタスクもぜひチャレンジしてください！`);
      
      handleBackToList();
    }
  };

  const generateNewTask = () => {
    const newTasks = [
      {
        id: Date.now().toString(),
        title: '心に残る瞬間',
        content: '最近心に残った小さな出来事について、その時の感情と一緒に教えてください。',
        aiName: 'メモリー先生',
        completed: false
      },
      {
        id: (Date.now() + 1).toString(),
        title: '未来への手紙',
        content: '1年後の自分に向けて、今の気持ちや目標を込めた短い手紙を書いてください。',
        aiName: 'フューチャー博士',
        completed: false
      }
    ];
    
    const randomTask = newTasks[Math.floor(Math.random() * newTasks.length)];
    setTasks(prev => [randomTask, ...prev]);
    
    alert(`新しいタスクが追加されました！\n\n${randomTask.aiName}より「${randomTask.title}」\n\nぜひチャレンジしてみてください！`);
  };

  return (
    <div style={{
      background: '#fccc00',
      minHeight: '100vh',
      color: '#2c3e50',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#eb6100',
        color: 'white',
        borderBottom: '5px solid #004c97',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>🧠 Chatヒューマン</h1>
        <p>AIからの依頼に応える新しい体験</p>
        <div style={{
          backgroundColor: '#fccc00',
          color: '#2c3e50',
          border: '2px solid #914e25',
          padding: '5px 10px',
          borderRadius: '5px',
          display: 'inline-block',
          marginTop: '10px'
        }}>
          🚀 シンプルモード
        </div>
      </header>

      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        {!currentTask ? (
          // タスク一覧表示
          <div>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button
                onClick={generateNewTask}
                style={{
                  backgroundColor: '#004c97',
                  color: 'white',
                  border: '3px solid #15722c',
                  padding: '15px 30px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                🎲 新しいAI依頼を生成
              </button>
            </div>

            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>📋 AIからの依頼一覧</h2>
            
            {tasks.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '18px' }}>
                まだタスクがありません。「新しいAI依頼を生成」ボタンを押してください！
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '15px' }}>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: task.completed ? '#d4edda' : 'white',
                      border: `3px solid ${task.completed ? '#155724' : '#004c97'}`,
                      borderRadius: '10px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => handleTaskSelect(task.id)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0, color: '#2c3e50' }}>
                        {task.completed ? '✅' : '📝'} {task.title}
                      </h3>
                      <span style={{
                        backgroundColor: task.completed ? '#155724' : '#eb6100',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '15px',
                        fontSize: '12px'
                      }}>
                        {task.aiName}
                      </span>
                    </div>
                    <p style={{ margin: 0, lineHeight: '1.6' }}>{task.content}</p>
                    {task.completed && (
                      <p style={{ margin: '10px 0 0 0', fontStyle: 'italic', color: '#155724' }}>
                        ✨ 完了済み - 素晴らしい回答をありがとうございました！
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // タスク詳細表示
          <div>
            <button
              onClick={handleBackToList}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                marginBottom: '20px'
              }}
            >
              ← 戻る
            </button>

            <div style={{
              backgroundColor: 'white',
              border: '3px solid #004c97',
              borderRadius: '10px',
              padding: '30px',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{
                  backgroundColor: '#eb6100',
                  color: 'white',
                  padding: '5px 15px',
                  borderRadius: '20px',
                  fontSize: '14px'
                }}>
                  {currentTask.aiName}
                </span>
              </div>
              
              <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>
                {currentTask.title}
              </h2>
              
              <p style={{ fontSize: '18px', lineHeight: '1.8', textAlign: 'center' }}>
                {currentTask.content}
              </p>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '3px solid #15722c',
              borderRadius: '10px',
              padding: '20px'
            }}>
              <h3 style={{ marginTop: 0, color: '#2c3e50' }}>💭 あなたの回答:</h3>
              
              <textarea
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                placeholder="ここにあなたの回答を書いてください..."
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '15px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={handleSubmit}
                  disabled={!userResponse.trim()}
                  style={{
                    backgroundColor: userResponse.trim() ? '#15722c' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: userResponse.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  📤 回答を送信
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
