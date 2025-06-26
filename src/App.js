import { useState, useEffect } from 'react';
import './App.css';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Auth from './components/Auth';
import TaskGenerator from './components/TaskGenerator';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  return (
    <div className="app">
      <TaskGenerator user={user} />
    </div>
  );
}

export default App;
