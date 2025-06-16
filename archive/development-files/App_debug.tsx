import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState<string>('アプリ起動中...');
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`]);
  };

  useEffect(() => {
    addDebugInfo('🚀 App useEffect開始');
    
    // Firebase初期化テスト
    const testFirebase = async () => {
      try {
        addDebugInfo('🔥 Firebase初期化テスト開始');
        
        // firebase.tsをインポートしてテスト
        const firebase = await import('./firebase');
        addDebugInfo('✅ firebase.tsのインポート成功');
        
        if (firebase.auth) {
          addDebugInfo('✅ Firebase Auth利用可能');
        } else {
          addDebugInfo('❌ Firebase Auth利用不可');
        }
        
        if (firebase.db) {
          addDebugInfo('✅ Firestore利用可能');
        } else {
          addDebugInfo('❌ Firestore利用不可');
        }
        
        setStatus('Firebase初期化完了');
        addDebugInfo('🎉 Firebase初期化テスト完了');
        
        // 5秒後にメインアプリに切り替え
        setTimeout(() => {
          setStatus('メインアプリロード中...');
          addDebugInfo('🔄 メインアプリに切り替え中...');
          loadMainApp();
        }, 3000);
        
      } catch (error) {
        addDebugInfo('💥 Firebase初期化エラー: ' + String(error));
        setStatus('Firebase初期化エラー');
      }
    };
    
    testFirebase();
  }, []);

  const loadMainApp = async () => {
    try {
      addDebugInfo('📱 メインアプリコンポーネントロード開始');
      
      // 実際のAppコンポーネントをロード
      window.location.hash = '#main-app-ready';
      addDebugInfo('✅ メインアプリロード完了');
      
    } catch (error) {
      addDebugInfo('💥 メインアプリロードエラー: ' + String(error));
    }
  };

  return (
    <div style={{
      background: '#fccc00',
      minHeight: '100vh',
      color: '#2c3e50',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1>🧠 Chatヒューマン - デバッグモード</h1>
        <h2>{status}</h2>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginTop: '20px',
          textAlign: 'left',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <h3>🔧 デバッグ情報:</h3>
          {debugInfo.map((info, index) => (
            <div key={index} style={{
              marginBottom: '5px',
              padding: '5px',
              backgroundColor: '#f5f5f5',
              borderLeft: '3px solid #007acc',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {info}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#004c97',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🔄 リロード
          </button>
          
          <button 
            onClick={() => {
              setDebugInfo([]);
              setStatus('デバッグリセット');
            }}
            style={{
              backgroundColor: '#eb6100',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🧹 ログクリア
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
