#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'gemiyou'
});

const db = admin.firestore();

async function emergencyCleanup() {
  console.log('🚨 緊急クリーンアップ開始...');
  
  try {
    // テストユーザー（user-で始まるUID）を大量削除
    console.log('📊 テストユーザーを検索中...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    console.log(`📊 総ユーザー数: ${snapshot.size}`);
    
    let testUserCount = 0;
    let deletePromises = [];
    
    snapshot.forEach((doc) => {
      const userId = doc.id;
      if (userId.startsWith('user-')) {
        testUserCount++;
        deletePromises.push(doc.ref.delete());
        
        // バッチサイズを制限
        if (deletePromises.length >= 100) {
          console.log(`🗑️ ${deletePromises.length}件のテストユーザーを削除中...`);
        }
      }
    });
    
    console.log(`🗑️ ${testUserCount}件のテストユーザーを削除中...`);
    await Promise.all(deletePromises);
    console.log('✅ テストユーザー削除完了');
    
    // テストタスクも削除
    console.log('📋 テストタスクを削除中...');
    const tasksRef = db.collection('tasks');
    const taskSnapshot = await tasksRef.where('assignedTo', '>=', 'user-').where('assignedTo', '<', 'user.').get();
    
    const taskDeletePromises = [];
    taskSnapshot.forEach((doc) => {
      taskDeletePromises.push(doc.ref.delete());
    });
    
    console.log(`🗑️ ${taskDeletePromises.length}件のテストタスクを削除中...`);
    await Promise.all(taskDeletePromises);
    console.log('✅ テストタスク削除完了');
    
    console.log('🎉 緊急クリーンアップ完了！');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
    process.exit(1);
  }
}

emergencyCleanup();
