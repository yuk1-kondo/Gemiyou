import https from 'https';

const testMultipleTasks = async () => {
  console.log('🧪 複数タスク生成テスト開始...');
  
  for (let i = 0; i < 5; i++) {
    console.log(`\n--- タスク ${i + 1} ---`);
    
    try {
      const data = JSON.stringify({});
      
      const options = {
        hostname: 'createchattask-zptz7iprwa-uc.a.run.app',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            try {
              const result = JSON.parse(body);
              if (result.success) {
                const task = result.task;
                console.log(`📋 難易度: ${task.difficultyLevel ? task.difficultyLevel.name : task.difficulty}`);
                console.log(`🤖 AI: ${task.aiPersonality.name}`);
                console.log(`📝 タスク: ${task.request.substring(0, 100)}...`);
                console.log(`⏰ 想定時間: ${task.difficultyLevel ? task.difficultyLevel.timeLimit : '不明'}`);
                console.log(`🎯 合格点: ${task.aiPersonality.passingScore}点`);
              } else {
                console.log('❌ エラー:', result.error);
              }
              resolve();
            } catch (error) {
              console.log('❌ JSONパースエラー:', error.message);
              resolve();
            }
          });
        });

        req.on('error', (error) => {
          console.log('❌ リクエストエラー:', error.message);
          resolve();
        });

        req.write(data);
        req.end();
      });

      // リクエスト間隔
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log('❌ エラー:', error.message);
    }
  }
};

testMultipleTasks();
