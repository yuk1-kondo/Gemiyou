import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface UserData {
  uid: string;
  fcmToken?: string;
  createdAt: any;
  lastActive: any;
  notificationsEnabled: boolean;
}

class FirestoreService {
  // ユーザーをFirestoreに登録/更新
  async registerUser(uid: string, fcmToken?: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      const userData: Partial<UserData> = {
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
        console.log('ユーザー情報を更新しました:', uid);
      } else {
        // 新規ユーザーの登録
        userData.createdAt = serverTimestamp();
        await setDoc(userRef, userData);
        console.log('新規ユーザーを登録しました:', uid);
      }

      return true;
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      return false;
    }
  }

  // FCMトークンを更新
  async updateFCMToken(uid: string, fcmToken: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        fcmToken,
        notificationsEnabled: true,
        lastActive: serverTimestamp(),
      });
      
      console.log('FCMトークンを更新しました:', uid);
      return true;
    } catch (error) {
      console.error('FCMトークン更新エラー:', error);
      return false;
    }
  }

  // ユーザーの最終アクティブ時刻を更新
  async updateLastActive(uid: string): Promise<boolean> {
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
  async getUser(uid: string): Promise<UserData | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      
      return null;
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
      return null;
    }
  }

  // ユーザーのタスクを取得（シンプル版）
  async getUserTasks(uid: string, limitCount: number = 10): Promise<any[]> {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      
      // まずはシンプルに全てのタスクを取得してフィルタリング
      const tasksRef = collection(db, 'tasks');
      const querySnapshot = await getDocs(tasksRef);
      
      const userTasks: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.assignedTo === uid) {
          userTasks.push({
            id: doc.id,
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

  // タスクの回答を保存
  async saveTaskResponse(taskId: string, userId: string, response: string, evaluation?: any): Promise<boolean> {
    try {
      const { collection, addDoc, updateDoc, doc } = await import('firebase/firestore');
      
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
      
      console.log('✅ タスク回答を保存しました:', responseDoc.id);
      return true;
    } catch (error) {
      console.error('❌ タスク回答保存エラー:', error);
      return false;
    }
  }

  // ユーザーの回答履歴を取得
  async getUserResponses(userId: string, limitCount: number = 20): Promise<any[]> {
    try {
      const { collection, query, where, orderBy, getDocs, limit } = await import('firebase/firestore');
      
      const responsesRef = collection(db, 'responses');
      const q = query(
        responsesRef,
        where('userId', '==', userId),
        orderBy('submittedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const responses: any[] = [];
      
      querySnapshot.forEach((doc) => {
        responses.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return responses;
    } catch (error) {
      console.error('回答履歴取得エラー:', error);
      return [];
    }
  }

  // ユーザーの統計情報を取得
  async getUserStats(userId: string): Promise<any> {
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
  async getAllUsers(): Promise<any[]> {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      const users: any[] = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
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
