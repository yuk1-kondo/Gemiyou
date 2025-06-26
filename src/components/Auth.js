import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        if (displayName) {
          await updateProfile(result.user, {
            displayName: displayName
          });
        }
      }
      
      onAuthSuccess();
    } catch (error) {
      let errorMessage = '';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'メールアドレスの形式が正しくありません。';
          break;
        case 'auth/user-disabled':
          errorMessage = 'このアカウントは無効化されています。';
          break;
        case 'auth/user-not-found':
          errorMessage = 'ユーザーが見つかりません。';
          break;
        case 'auth/wrong-password':
          errorMessage = 'パスワードが間違っています。';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'このメールアドレスは既に使用されています。';
          break;
        case 'auth/weak-password':
          errorMessage = 'パスワードは6文字以上で入力してください。';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'ネットワークエラーです。接続を確認してください。';
          break;
        default:
          errorMessage = '認証に失敗しました: ' + error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      
      onAuthSuccess();
    } catch (error) {
      let errorMessage = 'Google認証に失敗しました。';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Google認証がキャンセルされました。';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください。';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInAnonymously(auth);
      
      onAuthSuccess();
    } catch (error) {
      setError('匿名認証に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Gemiyou</h1>
          <p>AIタスク生成プラットフォーム</p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            ログイン
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            新規登録
          </button>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="displayName">ユーザー名</label>
              <input
                id="displayName"
                type="text"
                placeholder="表示名を入力"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              placeholder="メールアドレスを入力"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="auth-button primary"
            disabled={loading}
          >
            {loading ? '処理中...' : (isLogin ? 'ログイン' : '新規登録')}
          </button>
        </form>

        <div className="auth-divider">
          <span>または</span>
        </div>

        <button 
          onClick={handleGoogleAuth}
          className="auth-button google"
          disabled={loading}
        >
          Googleでログイン
        </button>

        <button 
          onClick={handleAnonymousAuth}
          className="auth-button anonymous"
          disabled={loading}
        >
          ゲストとして続行
        </button>
      </div>
    </div>
  );
};

export default Auth;
