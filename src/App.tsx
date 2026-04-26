import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import Expenses from './components/Expenses';
import Planning from './components/Planning';
import Insights from './components/Insights';
import ScanReceipt from './components/ScanReceipt';
import Auth from './components/Auth';
import Navigation from './components/Navigation';
import Header from './components/Header';
import Settings from './components/Settings';
import { HouseholdProvider } from './context/HouseholdContext';
import { handleFirestoreError, OperationType } from './lib/firestoreErrorHandler';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to profile changes
        unsubscribeProfile = onSnapshot(userRef, async (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
            };
            try {
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'expenses':
        return <Expenses />;
      case 'planning':
        return <Planning />;
      case 'insights':
        return <Insights />;
      case 'settings':
        return <Settings />;
      case 'scan':
        return <ScanReceipt onComplete={() => setActiveTab('expenses')} />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <HouseholdProvider userId={user.uid} profile={profile}>
      <div className="min-h-screen bg-background text-on-background pb-20">
        <Header profile={profile} onNavigate={setActiveTab} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {renderTab()}
        </main>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </HouseholdProvider>
  );
}
