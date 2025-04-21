import { useCallback, useState, useMemo } from 'react';

interface Options<T> {
  maxHistorySize?: number;
  equalFn?: (a: T, b: T) => boolean;
}

export const useUndoRedo = <T>(initialValue: T, options: Options<T> = {}) => {
  const defaultEquals = (a: T, b: T) => a === b;
  const isEqual = options.equalFn || defaultEquals;

  const [state, setState] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: structuredClone(initialValue),
    future: [],
  });

  const set = useCallback(
    (newValue: T) => {
      setState((prev) => {
        if (isEqual(prev.present, newValue)) return prev;

        const newPast = prev.past.concat(structuredClone(prev.present));
        const limitedPast =
          options.maxHistorySize && newPast.length > options.maxHistorySize
            ? newPast.slice(-options.maxHistorySize)
            : newPast;

        return {
          past: limitedPast,
          present: structuredClone(newValue),
          future: [],
        };
      });
    },
    [options.maxHistorySize, isEqual]
  );

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;

      const lastIndex = prev.past.length - 1;
      const previous = prev.past[lastIndex];

      return {
        past: prev.past.slice(0, lastIndex),
        present: previous,
        future: [prev.present].concat(prev.future),
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];

      return {
        past: prev.past.concat(prev.present),
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setState({
      past: [],
      present: structuredClone(value),
      future: [],
    });
  }, []);

  return useMemo(
    () => ({
      state: state.present,
      set,
      undo,
      redo,
      reset,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      history: {
        past: state.past,
        future: state.future,
      },
    }),
    [state, set, undo, redo, reset]
  );
};
