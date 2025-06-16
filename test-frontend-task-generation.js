// フロントエンドのタスク生成をテストするスクリプト
const DYNAMIC_TASK_URL = 'https://us-central1-gemiyou.cloudfunctions.net/createDynamicTask';

async function testTaskGeneration() {
  console.log('🚀 フロントエンドタスク生成テスト開始');
  console.log('📡 URL:', DYNAMIC_TASK_URL);
  
  try {
    const requestBody = {
      userId: 'test-frontend-user',
      difficulty: 'beginner'
    };
    
    console.log('📋 リクエスト:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(DYNAMIC_TASK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'  // フロントエンドのOriginを模擬
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 レスポンス受信:', response.status, response.statusText);
    console.log('🔍 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ タスク生成成功!');
    console.log('📄 レスポンス:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ タスク生成エラー:', error);
    throw error;
  }
}

// Node.js環境での実行
if (typeof window === 'undefined') {
  // Node.js環境: fetchをインポート
  const fetch = require('node-fetch');
  
  testTaskGeneration()
    .then(result => {
      console.log('🎉 テスト完了 - 成功');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 テスト失敗:', error.message);
      process.exit(1);
    });
} else {
  // ブラウザ環境
  window.testTaskGeneration = testTaskGeneration;
  console.log('ブラウザでテストするには testTaskGeneration() を実行してください');
}
