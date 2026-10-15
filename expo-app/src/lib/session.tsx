import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { api, setAuthToken } from './api';
import type { AuthSession } from './types';

const SESSION_KEY = 'vendorsathi_session_v1';

type StorageHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
  initialValue: [boolean, T | null] = [true, null],
): StorageHook<T> {
  return useReducer(
    (_state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
    initialValue,
  ) as StorageHook<T>;
}

async function writeStorage(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // localStorage unavailable (private mode) — session stays in memory only
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

function useStoredSession(): StorageHook<AuthSession> {
  const [state, setState] = useAsyncState<AuthSession>();

  useEffect(() => {
    const apply = (session: AuthSession | null) => {
      // Set the API token in the same tick as the session so screens that mount
      // as a result of this state change always send an authenticated request.
      setAuthToken(session?.token ?? null);
      setState(session);
    };

    if (Platform.OS === 'web') {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SESSION_KEY) : null;
        apply(raw ? (JSON.parse(raw) as AuthSession) : null);
      } catch {
        apply(null);
      }
      return;
    }
    SecureStore.getItemAsync(SESSION_KEY)
      .then((raw) => apply(raw ? (JSON.parse(raw) as AuthSession) : null))
      .catch(() => apply(null));
  }, [setState]);

  const setValue = useCallback(
    (session: AuthSession | null) => {
      setAuthToken(session?.token ?? null);
      setState(session);
      void writeStorage(SESSION_KEY, session ? JSON.stringify(session) : null);
    },
    [setState],
  );

  return [state, setValue];
}

interface SessionContextValue {
  isLoading: boolean;
  session: AuthSession | null;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within <SessionProvider />');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStoredSession();

  const value = useMemo<SessionContextValue>(
    () => ({
      isLoading,
      session,
      signIn: (next: AuthSession) => setSession(next),
      signOut: () => setSession(null),
    }),
    [isLoading, session, setSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export { api };
