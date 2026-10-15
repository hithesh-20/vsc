import { useCallback, useEffect, useState } from 'react';

import { ApiError } from './api';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  reload: () => void;
  refresh: () => void;
  setData: (updater: (current: T | null) => T | null) => void;
}

function toMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

/**
 * Small data-fetching hook with first-load spinner, pull-to-refresh, error and
 * reload states. `fetcher` must be stable (wrap in useCallback) or provide deps.
 *
 * State updates only happen after an await so we never call setState
 * synchronously inside the load effect (React Compiler `set-state-in-effect`).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const result = await fetcher();
        if (active) {
          setDataState(result);
          setError(null);
        }
      } catch (err) {
        if (active) setError(toMessage(err));
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        setDataState(result);
      } catch (err) {
        setError(toMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [fetcher]);

  const refresh = useCallback(() => {
    void (async () => {
      setRefreshing(true);
      setError(null);
      try {
        const result = await fetcher();
        setDataState(result);
      } catch (err) {
        setError(toMessage(err));
      } finally {
        setRefreshing(false);
      }
    })();
  }, [fetcher]);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setDataState((current) => updater(current));
  }, []);

  return { data, loading, refreshing, error, reload, refresh, setData };
}
