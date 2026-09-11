import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { authApi, profileApi, getTokens, saveTokens, clearTokens } from '@coracure/api';
import type { OwnProfile } from '@coracure/api';

export const DEFAULT_SEEDED_PROFILE: OwnProfile = {
  id: 'seeded-patient-alex',
  fullName: 'Alex Morgan',
  dateOfBirth: '1992-06-15',
  age: 34,
  gender: 'male',
  preferredLanguage: 'English',
  regionId: 'reg-01',
  mobileNumber: '+91 98765 43210',
  status: 'active',
  isComplete: true,
};

interface AuthState {
  isAuthenticated: boolean;
  isNewAccount: boolean;
  user: OwnProfile | null;
  isLoading: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn: (
    accessToken: string,
    refreshToken: string,
    isNewAccount: boolean,
    seededUser?: OwnProfile
  ) => Promise<void>;
  loginAsDemo: (customProfile?: Partial<OwnProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isNewAccount: false,
    user: null,
    isLoading: false,
  });

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const tokensPromise = getTokens();
        const timeoutPromise = new Promise<{ accessToken: string; refreshToken: string } | null>((resolve) =>
          setTimeout(() => resolve(null), 100)
        );
        const tokens = await Promise.race([tokensPromise, timeoutPromise]);
        if (!active) return;
        if (tokens) {
          try {
            const profile = await profileApi.getProfile();
            setState({
              isAuthenticated: true,
              isNewAccount: false,
              user: profile,
              isLoading: false,
            });
          } catch {
            // Fallback for preview/offline mode
            setState({
              isAuthenticated: true,
              isNewAccount: false,
              user: DEFAULT_SEEDED_PROFILE,
              isLoading: false,
            });
          }
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        if (!active) return;
        await clearTokens();
        setState({ isAuthenticated: false, isNewAccount: false, user: null, isLoading: false });
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const signIn = async (
    accessToken: string,
    refreshToken: string,
    isNewAccount: boolean,
    seededUser?: OwnProfile
  ) => {
    try {
      await saveTokens(accessToken, refreshToken);
      let profile: OwnProfile | null = seededUser ?? null;
      if (!profile) {
        try {
          profile = await profileApi.getProfile();
        } catch {
          profile = DEFAULT_SEEDED_PROFILE;
        }
      }
      setState({
        isAuthenticated: true,
        isNewAccount,
        user: profile,
        isLoading: false,
      });
    } catch {
      setState({
        isAuthenticated: true,
        isNewAccount,
        user: seededUser || DEFAULT_SEEDED_PROFILE,
        isLoading: false,
      });
    }
  };

  const loginAsDemo = async (customProfile?: Partial<OwnProfile>) => {
    const demoUser: OwnProfile = { ...DEFAULT_SEEDED_PROFILE, ...customProfile };
    try {
      await saveTokens('demo-access-token', 'demo-refresh-token');
    } catch {}
    setState({
      isAuthenticated: true,
      isNewAccount: false,
      user: demoUser,
      isLoading: false,
    });
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authApi.signOut();
    } catch {
      // sign-out failure is non-blocking — clear local state regardless
    } finally {
      await clearTokens();
      setState({
        isAuthenticated: false,
        isNewAccount: false,
        user: null,
        isLoading: false,
      });
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await profileApi.getProfile();
      setState((prev) => ({ ...prev, user: profile, isNewAccount: false }));
    } catch {
      setState((prev) => ({ ...prev, user: prev.user || DEFAULT_SEEDED_PROFILE, isNewAccount: false }));
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, loginAsDemo, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
