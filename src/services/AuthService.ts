import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  static onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static isAdmin(user: User | null): boolean {
    return user?.email === 'mendes.alexandre@tjrj.jus.br';
  }
}
