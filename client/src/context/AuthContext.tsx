import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getFirebaseAuth,
  googleProvider,
  appleProvider,
  firebaseAuthHelpers,
  type User,
} from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = firebaseAuthHelpers.onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const auth = getFirebaseAuth();

    return {
      user,
      loading,
      signInWithEmail: async (email, password) => {
        await firebaseAuthHelpers.signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      },
      registerWithEmail: async (email, password) => {
        await firebaseAuthHelpers.createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      },
      signInWithGoogle: async () => {
        await firebaseAuthHelpers.signInWithPopup(auth, googleProvider);
      },
      signInWithApple: async () => {
        await firebaseAuthHelpers.signInWithPopup(auth, appleProvider);
      },
      signOutUser: async () => {
        await firebaseAuthHelpers.signOut(auth);
      },
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
