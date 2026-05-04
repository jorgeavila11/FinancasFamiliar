import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { Household, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface HouseholdContextType {
  household: Household | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refreshHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType>({
  household: null,
  profile: null,
  loading: true,
  error: null,
  refreshHousehold: async () => {},
});

export const HouseholdProvider: React.FC<{ userId: string; profile: UserProfile | null; children: React.ReactNode }> = ({ userId, profile, children }) => {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHousehold = async () => {
    // Household is already sync'd via onSnapshot, but we can provide this for compatibility
    // or manual triggers if needed.
  };

  useEffect(() => {
    if (!profile?.householdId) {
      // Look for household where user is a member
      const q = query(collection(db, 'households'), where('members', 'array-contains', userId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0];
          setHousehold({ id: docData.id, ...docData.data() } as Household);
        } else {
          setHousehold(null);
        }
        setLoading(false);
      }, (err) => {
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, 'households');
        } catch (wrappedError) {
          setError(wrappedError instanceof Error ? wrappedError.message : String(wrappedError));
        }
      });
      return () => unsubscribe();
    } else {
      const path = `households/${profile.householdId}`;
      const unsubscribe = onSnapshot(doc(db, 'households', profile.householdId), (docSnap) => {
        if (docSnap.exists()) {
          setHousehold({ id: docSnap.id, ...docSnap.data() } as Household);
        }
        setLoading(false);
      }, (err) => {
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.GET, path);
        } catch (wrappedError) {
          setError(wrappedError instanceof Error ? wrappedError.message : String(wrappedError));
        }
      });
      return () => unsubscribe();
    }
  }, [userId, profile?.householdId]);

  return (
    <HouseholdContext.Provider value={{ household, profile, loading, error, refreshHousehold }}>
      {children}
    </HouseholdContext.Provider>
  );
};

export const useHousehold = () => useContext(HouseholdContext);
