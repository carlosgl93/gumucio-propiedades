// services/authService.ts
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/firebase';

export class AuthService {
  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }
}

export const authService = new AuthService();
