import { useCallback, useState, useMemo } from 'react';

export const useUndoRedo = <T>(initialValue: T) => {
  const [state, setState] = useState<{
    past: T[];
    present: T;
    future: T[];
  }>({
    past: [],
    present: initialValue,
    future: [],
  });

  const set = useCallback((newValue: T) => {
    setState((prev) => {
      if (prev.present === newValue) return prev;

      return {
        past: prev.past.concat(prev.present),
        present: newValue,
        future: [],
      };
    });
  }, []);

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
      present: value,
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
