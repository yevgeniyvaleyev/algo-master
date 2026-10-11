import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDataVersion } from '@/store/data-version';

/**
 * Runs an async DB query on focus and after every data mutation.
 * `key` must change whenever the query's inputs change.
 */
export function useQuery<T>(fn: () => Promise<T>, key: string = ''): T | undefined {
  const version = useDataVersion((s) => s.version);
  const [data, setData] = useState<T>();
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fnRef.current().then((result) => {
        if (!cancelled) setData(result);
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on data mutations and input changes
    }, [version, key]),
  );

  return data;
}
