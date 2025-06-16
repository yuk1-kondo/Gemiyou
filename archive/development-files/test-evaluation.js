const https = require('https');

// Test evaluation with poor quality response
const testPoorResponse = () => {
  const data = JSON.stringify({
    taskId: "3DRwXbrrUUSfCUjHOtmA", // Use actual task ID
    userResponse: "はい", // Very short, low quality response
    chatHistory: []
  });

  const options = {
    hostname: 'evaluatechatresponse-zptz7iprwa-uc.a.run.app',
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log('Poor Response Test Result:');
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
};

// Test evaluation with good quality response
const testGoodResponse = () => {
  const data = JSON.stringify({
    taskId: "3DRwXbrrUUSfCUjHOtmA", // Use actual task ID
    userResponse: "最新のニュース記事要約：政府が新たな経済対策を発表し、中小企業支援に100億円を投入。業界関係者は安堵の表情を見せている。感情分析：関係者の安堵感は不安からの解放を示し、この感情により積極的な投資判断や雇用拡大への行動が促進される可能性が高い。",
    chatHistory: []
  });

  const options = {
    hostname: 'evaluatechatresponse-zptz7iprwa-uc.a.run.app',
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      console.log('\nGood Response Test Result:');
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(data);
  req.end();
};

console.log('Testing improved evaluation system...');
testPoorResponse();
setTimeout(() => testGoodResponse(), 2000);
