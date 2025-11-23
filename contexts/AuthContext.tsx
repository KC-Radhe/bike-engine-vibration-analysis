import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged, signInWithEmailAndPassword, User
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";


interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect( () => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const signUp = async (email: string, password: string, fullName: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            await setDoc( doc(db, 'profiles', userCredential.user.uid), {
                email,
                fullName,
                bikeModel: null,
                bikeRegistration: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return { error: null };

        } catch (error: any) {
            return { error };
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Sign out error: ', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user,loading, signIn, signUp, signOut }} >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}