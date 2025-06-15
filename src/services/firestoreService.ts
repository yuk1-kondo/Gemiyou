import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AIPersonality } from './geminiService';

export interface User {
  id: string;
  fcmToken?: string;
  createdAt: Date;
  lastActive: Date;
}

export interface Task {
  id: string;
  userId: string;
  personality: AIPersonality;
  requestText: string;
  userResponse?: string;
  evaluated: boolean;
  feedbackText?: string;
  score?: number;
  createdAt: Date;
  respondedAt?: Date;
  evaluatedAt?: Date;
}

class FirestoreService {
  // ユーザー関連
  async createUser(userId: string, fcmToken?: string): Promise<void> {
    try {
      console.log('ユーザー作成開始:', userId);
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcmToken,
        createdAt: Timestamp.now(),
        lastActive: Timestamp.now()
      }, { merge: true });
      console.log('ユーザー作成完了:', userId);
    } catch (error) {
      console.error('ユーザー作成エラー:', error);
      throw error;
    }
  }

  async updateUserFCMToken(userId: string, fcmToken: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken,
      lastActive: Timestamp.now()
    });
  }

  async getUser(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: userSnap.id,
        fcmToken: data.fcmToken,
        createdAt: data.createdAt.toDate(),
        lastActive: data.lastActive.toDate()
      };
    }
    return null;
  }

  // タスク関連
  async createTask(userId: string, personality: AIPersonality, requestText: string): Promise<string> {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const docRef = await addDoc(tasksRef, {
      personality,
      requestText,
      evaluated: false,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  async updateTaskResponse(userId: string, taskId: string, userResponse: string): Promise<void> {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, {
      userResponse,
      respondedAt: Timestamp.now()
    });
  }

  async updateTaskEvaluation(userId: string, taskId: string, feedbackText: string, score: number): Promise<void> {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, {
      feedbackText,
      score,
      evaluated: true,
      evaluatedAt: Timestamp.now()
    });
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (taskSnap.exists()) {
      const data = taskSnap.data();
      return {
        id: taskSnap.id,
        userId,
        personality: data.personality,
        requestText: data.requestText,
        userResponse: data.userResponse,
        evaluated: data.evaluated,
        feedbackText: data.feedbackText,
        score: data.score,
        createdAt: data.createdAt.toDate(),
        respondedAt: data.respondedAt?.toDate(),
        evaluatedAt: data.evaluatedAt?.toDate()
      };
    }
    return null;
  }

  async getUserTasks(userId: string, maxTasks: number = 20): Promise<Task[]> {
    try {
      console.log('タスク取得開始:', userId);
      
      // グローバルタスクコレクションから取得（新しいシステム）
      const globalTasksRef = collection(db, 'tasks');
      const globalQuery = query(
        globalTasksRef, 
        orderBy('createdAt', 'desc'),
        limit(maxTasks)
      );
      const globalSnapshot = await getDocs(globalQuery);
      
      const tasks: Task[] = [];
      
      // 新しい形式のタスクを処理
      globalSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // 新しい拡張システムの構造かチェック
        if (data.aiPersonality && data.request) {
          tasks.push({
            id: doc.id,
            userId,
            personality: {
              name: data.aiPersonality.name,
              type: data.aiPersonality.type,
              description: data.aiPersonality.personality,
              style: data.aiPersonality.taskStyle
            },
            requestText: data.request,
            userResponse: data.userResponse || null,
            evaluated: data.isCompleted || false,
            feedbackText: data.feedbackText || null,
            score: data.totalScore || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            respondedAt: data.respondedAt?.toDate(),
            evaluatedAt: data.evaluatedAt?.toDate()
          });
        }
      });
      
      // 古い形式のタスクも取得（ユーザー個別コレクション）
      try {
        const userTasksRef = collection(db, 'users', userId, 'tasks');
        const userQuery = query(userTasksRef, orderBy('createdAt', 'desc'));
        const userSnapshot = await getDocs(userQuery);
        
        userSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.personality && data.requestText) {
            tasks.push({
              id: doc.id,
              userId,
              personality: data.personality,
              requestText: data.requestText,
              userResponse: data.userResponse,
              evaluated: data.evaluated,
              feedbackText: data.feedbackText,
              score: data.score,
              createdAt: data.createdAt.toDate(),
              respondedAt: data.respondedAt?.toDate(),
              evaluatedAt: data.evaluatedAt?.toDate()
            });
          }
        });
      } catch (userTaskError) {
        console.warn('ユーザータスク取得エラー（無視します）:', userTaskError);
      }
      
      // 作成日時で並び替え
      tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('タスク取得完了:', tasks.length, '件');
      return tasks.slice(0, maxTasks);
    } catch (error) {
      console.error('タスク取得エラー:', error);
      return []; // エラー時は空配列を返す
    }
  }

  async getUnrespondedTasks(userId: string): Promise<Task[]> {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(
      tasksRef, 
      where('userResponse', '==', null),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        personality: data.personality,
        requestText: data.requestText,
        userResponse: data.userResponse,
        evaluated: data.evaluated,
        feedbackText: data.feedbackText,
        score: data.score,
        createdAt: data.createdAt.toDate(),
        respondedAt: data.respondedAt?.toDate(),
        evaluatedAt: data.evaluatedAt?.toDate()
      };
    });
  }

  // チャット関連の機能を追加
  async saveChatMessage(userId: string, taskId: string, message: any): Promise<void> {
    try {
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      const chatRef = collection(taskRef, 'chatHistory');
      await addDoc(chatRef, {
        ...message,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('チャットメッセージ保存エラー:', error);
      throw error;
    }
  }

  async getChatHistory(userId: string, taskId: string): Promise<any[]> {
    try {
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      const chatRef = collection(taskRef, 'chatHistory');
      const q = query(chatRef, orderBy('timestamp', 'asc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        };
      });
    } catch (error) {
      console.error('チャット履歴取得エラー:', error);
      return [];
    }
  }

  async updateTaskChatStatus(userId: string, taskId: string, updates: any): Promise<void> {
    try {
      const taskRef = doc(db, 'users', userId, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        lastUpdate: Timestamp.now()
      });
    } catch (error) {
      console.error('タスクチャット状態更新エラー:', error);
      throw error;
    }
  }

  // FCMトークン管理（Cloud Functionsで使用）
  async saveFCMToken(userId: string, token: string): Promise<void> {
    const tokenRef = doc(db, 'fcmTokens', token);
    await setDoc(tokenRef, {
      userId,
      updatedAt: Timestamp.now()
    });
  }

  async getAllFCMTokens(): Promise<{ token: string; userId: string }[]> {
    const tokensRef = collection(db, 'fcmTokens');
    const querySnapshot = await getDocs(tokensRef);
    
    return querySnapshot.docs.map(doc => ({
      token: doc.id,
      userId: doc.data().userId
    }));
  }
}

export const firestoreService = new FirestoreService();
