import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';

class FirestoreService {
  // ユーザーをFirestoreに登録/更新
  async registerUser(uid, fcmToken) {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      const userData = {
        uid,
        lastActive: serverTimestamp(),
        notificationsEnabled: !!fcmToken,
      };

      if (fcmToken) {
        userData.fcmToken = fcmToken;
      }

      if (userDoc.exists()) {
        // 既存ユーザーの更新
        await updateDoc(userRef, userData);
      } else {
        // 新規ユーザーの登録
        userData.createdAt = serverTimestamp();
        await setDoc(userRef, userData);
      }

      return true;
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      return false;
    }
  }

  // FCMトークンを更新
  async updateFCMToken(uid, fcmToken) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        fcmToken,
        notificationsEnabled: true,
        lastActive: serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error('FCMトークン更新エラー:', error);
      return false;
    }
  }

  // ユーザーの最終アクティブ時刻を更新
  async updateLastActive(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        lastActive: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('最終アクティブ時刻更新エラー:', error);
      return false;
    }
  }

  // ユーザー情報を取得
  async getUser(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      return null;
    }
  }

  // タスクの回答を保存
  async saveTaskResponse(taskId, userId, response, evaluation) {
    try {
      // 回答をresponsesコレクションに保存
      const responseData = {
        taskId,
        userId,
        response,
        submittedAt: serverTimestamp(),
        evaluation: evaluation || null
      };
      
      const responsesRef = collection(db, 'responses');
      const responseDoc = await addDoc(responsesRef, responseData);
      
      // タスクの状態を更新
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        responseId: responseDoc.id
      });
      
      return true;
    } catch (error) {
      console.error('❌ タスク回答保存エラー:', error);
      return false;
    }
  }

  // ユーザーのタスクを取得（シンプル版）
  async getUserTasks(uid, limitCount = 10) {
    try {
      // まずはシンプルに全てのタスクを取得してフィルタリング
      const tasksRef = collection(db, 'tasks');
      const querySnapshot = await getDocs(tasksRef);
      
      const userTasks = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === uid) {
          userTasks.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      
      // 作成日時でソート（新しい順）
      userTasks.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      return userTasks.slice(0, limitCount);
    } catch (error) {
      console.error('タスク取得エラー:', error);
      return [];
    }
  }

  // ユーザーの回答履歴を取得
  async getUserResponses(userId, limitCount = 20) {
    try {
      const responsesRef = collection(db, 'responses');
      const q = query(
        responsesRef,
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const responses = [];
      
      querySnapshot.forEach((docSnap) => {
        responses.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      return responses;
    } catch (error) {
      console.error('回答履歴取得エラー:', error);
      return [];
    }
  }

  // ユーザーの統計情報を取得
  async getUserStats(userId) {
    try {
      // タスク総数を取得
      const tasks = await this.getUserTasks(userId, 100);
      
      // 回答履歴を取得
      const responses = await this.getUserResponses(userId, 100);
      
      // 今日の日付（JST）
      const today = new Date().toLocaleDateString('ja-JP');
      
      const completedToday = responses.filter(r => {
        try {
          let responseDate = '';
          if (r.submittedAt?.toDate) {
            // Firestore Timestamp
            responseDate = r.submittedAt.toDate().toLocaleDateString('ja-JP');
          } else if (r.submittedAt?.seconds) {
            // seconds形式
            responseDate = new Date(r.submittedAt.seconds * 1000).toLocaleDateString('ja-JP');
          } else if (r.submittedAt instanceof Date) {
            // Date オブジェクト
            responseDate = r.submittedAt.toLocaleDateString('ja-JP');
          }
          return responseDate === today;
        } catch (error) {
          console.log('日付変換エラー:', error, r.submittedAt);
          return false;
        }
      }).length;
      
      // 回答した点数の合計を計算
      const totalScore = responses.reduce((sum, r) => {
        const score = r.evaluation?.score || 0;
        return sum + score;
      }, 0);
      
      return {
        totalTasks: tasks.length, // 生成されたタスク数
        completedToday, // 今日の完了数
        totalScore // 回答した点数の合計
      };
    } catch (error) {
      console.error('統計情報取得エラー:', error);
      return { totalTasks: 0, completedToday: 0, totalScore: 0 };
    }
  }

  // デバッグ用：すべてのユーザーデータを取得
  async getAllUsers() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users = [];
      querySnapshot.forEach((docSnap) => {
        users.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      return users;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      return [];
    }
  }
}

export const firestoreService = new FirestoreService();
