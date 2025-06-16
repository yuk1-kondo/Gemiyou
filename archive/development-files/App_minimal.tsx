import React from 'react';
import './App.css';

function App() {
  console.log('🚀 App component rendered');

  return (
    <div style={{ 
      background: '#fccc00', 
      minHeight: '100vh', 
      color: '#2c3e50',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column'
    }}>
      <h1 style={{ color: '#eb6100' }}>🧠 Chatヒューマン</h1>
      <p>超シンプル版 - React基本動作テスト</p>
      <div style={{
        background: '#eb6100',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        marginTop: '20px'
      }}>
        ✅ Reactが正常に動作しています
      </div>
    </div>
  );
}

export default App;
