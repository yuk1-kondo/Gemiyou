// Simple test script to check task generation
import fetch from 'node-fetch';

async function testTaskGeneration() {
  try {
    console.log('🧪 タスク生成テスト開始...');
    
    const response = await fetch('https://createchattask-zptz7iprwa-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    console.log('📡 レスポンス状態:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ エラーレスポンス:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ 成功レスポンス:', data);
    
    if (data.success && data.task) {
      console.log('📋 生成されたタスク:');
      console.log('- ID:', data.task.id);
      console.log('- AIパーソナリティ:', data.task.aiPersonality.name);
      console.log('- タスク内容:', data.task.request);
    }
    
  } catch (error) {
    console.error('💥 エラー:', error);
  }
}

// Run the test
testTaskGeneration();
