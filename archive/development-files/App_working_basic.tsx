import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 App起動開始');
    
    // 基本的な初期化
    setTimeout(() => {
      console.log('✅ 基本初期化完了');
      setInitialized(true);
    }, 1000);
    
  }, []);

  if (error) {
    return (
      <div className="App" style={{ background: '#fccc00', minHeight: '100vh', padding: '20px' }}>
        <h1>エラーが発生しました</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>リロード</button>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="App" style={{ background: '#fccc00', minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
        <h1>🧠 Chatヒューマン</h1>
        <p>初期化中...</p>
        <div style={{ fontSize: '24px', margin: '20px' }}>⏳</div>
      </div>
    );
  }

  return (
    <div className="App" style={{ background: '#fccc00', minHeight: '100vh', color: '#2c3e50' }}>
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
          🔧 基本モード
        </div>
      </header>

      <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button
            onClick={() => alert('新しいタスクが生成されました！\n\n詩を書く: 今日の気持ちを短い詩で表現してください。')}
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
        
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{
            backgroundColor: 'white',
            border: '3px solid #004c97',
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => alert('タスク詳細:\n\n今日あなたが感じた気持ちを、短い詩で表現してください。季節感や色彩を入れると素敵ですね。')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>📝 今日の気持ちを詩で表現</h3>
              <span style={{
                backgroundColor: '#eb6100',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '15px',
                fontSize: '12px'
              }}>
                ポエム先生
              </span>
            </div>
            <p style={{ margin: 0, lineHeight: '1.6' }}>
              今日あなたが感じた気持ちを、短い詩で表現してください。季節感や色彩を入れると素敵ですね。
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '3px solid #004c97',
            borderRadius: '10px',
            padding: '20px',
            cursor: 'pointer'
          }}
          onClick={() => alert('タスク詳細:\n\nもし時間とお金に制約がなかったら、どんな一日を過ごしたいですか？具体的に教えてください。')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>📝 理想の一日を描く</h3>
              <span style={{
                backgroundColor: '#eb6100',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '15px',
                fontSize: '12px'
              }}>
                ドリーム博士
              </span>
            </div>
            <p style={{ margin: 0, lineHeight: '1.6' }}>
              もし時間とお金に制約がなかったら、どんな一日を過ごしたいですか？具体的に教えてください。
            </p>
          </div>
        </div>

        <div style={{ 
          textAlign: 'center', 
          marginTop: '40px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '2px solid #004c97'
        }}>
          <h3>🚀 動作テスト成功</h3>
          <p>基本的なUIが正常に表示されています。</p>
          <p>Firebase接続やGemini APIの機能は段階的に追加していきます。</p>
        </div>
      </main>
    </div>
  );
}

export default App;
