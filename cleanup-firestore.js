import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCm_lys36ejCVXQ9Uof_9kN_vPSnjtyxm8",
  authDomain: "gemiyou.firebaseapp.com",
  projectId: "gemiyou",
  storageBucket: "gemiyou.firebasestorage.app",
  messagingSenderId: "1047854827926",
  appId: "1:1047854827926:web:e2d3b45f2a8c7d8f123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirestoreData() {
  console.log('🔍 Firestore データ確認中...');
  
  try {
    // タスクコレクションを確認
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    console.log(`📋 タスク数: ${tasksSnapshot.size}`);
    
    if (tasksSnapshot.size > 0) {
      console.log('\n📄 保存されているタスク:');
      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  作成日時: ${data.createdAt || data.generatedAt || '不明'}`);
        console.log(`  ユーザー: ${data.userId || '不明'}`);
        console.log(`  内容: ${(data.content || '').substring(0, 50)}...`);
        console.log('');
      });
    }
    
    // ユーザーコレクションを確認
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`👤 ユーザー数: ${usersSnapshot.size}`);
    
    // チャットコレクションを確認
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    console.log(`💬 チャット数: ${chatsSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

async function clearFirestoreData() {
  console.log('🧹 Firestore データ削除中...');
  
  try {
    // タスクを削除
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));
    const deleteTaskPromises = tasksSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'tasks', docSnapshot.id))
    );
    await Promise.all(deleteTaskPromises);
    console.log(`✅ ${tasksSnapshot.size} 個のタスクを削除しました`);
    
    // ユーザーを削除
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const deleteUserPromises = usersSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'users', docSnapshot.id))
    );
    await Promise.all(deleteUserPromises);
    console.log(`✅ ${usersSnapshot.size} 個のユーザーを削除しました`);
    
    // チャットを削除
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    const deleteChatPromises = chatsSnapshot.docs.map(docSnapshot => 
      deleteDoc(doc(db, 'chats', docSnapshot.id))
    );
    await Promise.all(deleteChatPromises);
    console.log(`✅ ${chatsSnapshot.size} 個のチャットを削除しました`);
    
    console.log('🎉 Firestore データ削除完了！');
    
  } catch (error) {
    console.error('❌ データ削除エラー:', error);
  }
}

async function main() {
  console.log('🧹 Firebase Firestore クリーンアップツール');
  console.log('==========================================\n');
  
  // まずデータ状況を確認
  await checkFirestoreData();
  
  console.log('\n❓ データを削除しますか？');
  console.log('1. データ削除を実行するには: node cleanup-firestore.js --delete');
  console.log('2. 確認のみの場合: そのまま終了します');
  
  if (process.argv.includes('--delete')) {
    console.log('\n⚠️  データ削除を実行します...');
    await clearFirestoreData();
  } else {
    console.log('\n✅ 確認のみ完了しました');
  }
}

main().catch(console.error);
