import { useEffect, useState } from 'react';

import { User } from 'firebase/auth';

import { authService } from '@/services/auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const user = await authService.login(email, password);
      setAuthState({ user, loading: false, error: null });
    } catch (error) {
      setAuthState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Error de autenticación',
      });
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setAuthState({ user: null, loading: false, error: null });
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error al cerrar sesión',
      }));
    }
  };

  return {
    ...authState,
    login,
    logout,
    isAuthenticated: !!authState.user,
  };
};
