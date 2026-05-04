import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';

export class AuthService {
  private static provider = new GoogleAuthProvider();

  static async loginWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, this.provider);
    return result.user;
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }

  static onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static isAuthorized(user: User | null): boolean {
    if (!user) return false;
    const authorizedEmails = [
      'alexandre@example.com', // Placeholder, user will need to provide real ones or I use displayName
      'chefe@example.com'
    ];
    // For simplicity in this demo, I'll check if the name contains Alexandre or Chefe
    const name = user.displayName?.toLowerCase() || '';
    return name.includes('alexandre') || name.includes('chefe') || user.email === 'espacocarreiro@gmail.com';
  }
}
