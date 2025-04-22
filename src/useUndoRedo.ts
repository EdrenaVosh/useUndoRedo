import { useCallback, useState, useMemo, useRef } from 'react';

interface Options<T> {
  maxHistorySize?: number;
  equalFn?: (a: T, b: T) => boolean;
  compressHistory?: boolean;

  // Callbacks for undo/redo/set
  onUndo?: (prevState: T, nextState: T) => void;
  onRedo?: (prevState: T, nextState: T) => void;
  onSet?: (prevState: T, nextState: T) => void;
}

type CompressedData = string;

type StoredData<T> = T | CompressedData;

interface UndoRedoState<T> {
  past: StoredData<T>[];
  present: T;
  future: StoredData<T>[];
  isCompressed: boolean;
  isBatching: boolean;
}

interface History<T> {
  past: T[];
  future: T[];
}

interface UndoRedoResult<T> {
  state: T;
  set: (newValue: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (value: T) => void;
  startBatch: () => void;
  endBatch: () => void;
  withBatch: <R>(fn: (state: T) => R) => R;
  canUndo: boolean;
  canRedo: boolean;
  history: History<T>;
  isCompressed: boolean;
}

const safeStructuredClone = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }

  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch (error) {
    console.warn('safeStructuredClone fallback failed', error);

    return obj;
  }
};

const compress = <T>(data: T): CompressedData => {
  return JSON.stringify(data);
};

const decompress = <T>(compressed: CompressedData): T => {
  try {
    return JSON.parse(compressed) as T;
  } catch (error) {
    return compressed as unknown as T;
  }
};

export const useUndoRedo = <T>(
  initialValue: T,
  options: Options<T> = {}
): UndoRedoResult<T> => {
  const defaultEquals = (a: T, b: T) => a === b;
  const isEqual = options.equalFn || defaultEquals;

  const optionsRef = useRef({
    maxHistorySize: options.maxHistorySize,
    equalFn: isEqual,
    compressHistory: options.compressHistory || false,
    onUndo: options.onUndo,
    onRedo: options.onRedo,
    onSet: options.onSet,
  });

  if (
    options.maxHistorySize !== optionsRef.current.maxHistorySize ||
    options.equalFn !== optionsRef.current.equalFn ||
    options.compressHistory !== optionsRef.current.compressHistory ||
    options.onUndo !== optionsRef.current.onUndo ||
    options.onRedo !== optionsRef.current.onRedo ||
    options.onSet !== optionsRef.current.onSet
  ) {
    optionsRef.current = {
      maxHistorySize: options.maxHistorySize,
      equalFn: options.equalFn || defaultEquals,
      compressHistory: options.compressHistory || false,
      onUndo: options.onUndo,
      onRedo: options.onRedo,
      onSet: options.onSet,
    };
  }

  const isCompressed = useCallback((state: UndoRedoState<T>) => {
    return state.isCompressed;
  }, []);

  const compressFn = useCallback((data: T): StoredData<T> => {
    return optionsRef.current.compressHistory
      ? compress(data)
      : safeStructuredClone(data);
  }, []);

  const decompressFn = useCallback(
    (stored: StoredData<T>, stateIsCompressed: boolean): T => {
      if (typeof stored !== 'string') {
        return stored;
      }

      if (stateIsCompressed) {
        return decompress<T>(stored);
      }

      return stored as unknown as T;
    },
    []
  );

  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: safeStructuredClone(initialValue),
    future: [],
    isCompressed: optionsRef.current.compressHistory,
    isBatching: false,
  });

  const batchCountRef = useRef<number>(0);
  const batchInitialValueRef = useRef<T | null>(null);
  const batchLastValueRef = useRef<T | null>(null);
  const errorInWithBatchRef = useRef<boolean>(false);

  const set = useCallback((newValue: T) => {
    setState((prev) => {
      const { equalFn, maxHistorySize, compressHistory, onSet } =
        optionsRef.current;

      if (equalFn(prev.present, newValue)) return prev;

      if (prev.isBatching) {
        batchLastValueRef.current = safeStructuredClone(newValue);

        if (errorInWithBatchRef.current && batchInitialValueRef.current) {
          const storedInitialValue = compressHistory
            ? compress(batchInitialValueRef.current)
            : safeStructuredClone(batchInitialValueRef.current);

          return {
            past: [...prev.past, storedInitialValue],
            present: safeStructuredClone(newValue),
            future: [],
            isCompressed: compressHistory,
            isBatching: true,
          };
        }

        return {
          ...prev,
          present: safeStructuredClone(newValue),
          future: [],
        };
      }

      if (onSet) {
        onSet(prev.present, newValue);
      }

      const storedPresent = compressHistory
        ? compress(prev.present)
        : safeStructuredClone(prev.present);
      const newPast = [...prev.past, storedPresent];

      const limitedPast =
        maxHistorySize && newPast.length > maxHistorySize
          ? newPast.slice(-maxHistorySize)
          : newPast;

      return {
        past: limitedPast,
        present: safeStructuredClone(newValue),
        future: [],
        isCompressed: compressHistory,
        isBatching: false,
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;

      const { onUndo } = optionsRef.current;
      const lastIndex = prev.past.length - 1;
      const previousStored = prev.past[lastIndex];
      const previous = decompressFn(previousStored, prev.isCompressed);

      if (onUndo) {
        onUndo(prev.present, previous);
      }

      const storedPresent = prev.isCompressed
        ? compress(prev.present)
        : safeStructuredClone(prev.present);

      return {
        past: prev.past.slice(0, lastIndex),
        present: previous,
        future: [storedPresent, ...prev.future],
        isCompressed: prev.isCompressed,
        isBatching: false,
      };
    });
  }, [decompressFn]);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;

      const { onRedo } = optionsRef.current;
      const nextStored = prev.future[0];
      const next = decompressFn(nextStored, prev.isCompressed);

      if (onRedo) {
        onRedo(prev.present, next);
      }

      const storedPresent = prev.isCompressed
        ? compress(prev.present)
        : safeStructuredClone(prev.present);

      return {
        past: [...prev.past, storedPresent],
        present: next,
        future: prev.future.slice(1),
        isCompressed: prev.isCompressed,
        isBatching: false,
      };
    });
  }, [decompressFn]);

  const reset = useCallback((value: T) => {
    batchCountRef.current = 0;
    batchInitialValueRef.current = null;
    batchLastValueRef.current = null;
    errorInWithBatchRef.current = false;

    setState({
      past: [],
      present: safeStructuredClone(value),
      future: [],
      isCompressed: optionsRef.current.compressHistory,
      isBatching: false,
    });
  }, []);

  const startBatch = useCallback(() => {
    setState((prev) => {
      batchCountRef.current += 1;

      if (batchCountRef.current === 1) {
        batchInitialValueRef.current = safeStructuredClone(prev.present);
        batchLastValueRef.current = safeStructuredClone(prev.present);
      }

      return {
        ...prev,
        isBatching: true,
      };
    });
  }, []);

  const endBatch = useCallback(() => {
    setState((prev) => {
      const { compressHistory, equalFn, maxHistorySize, onSet } =
        optionsRef.current;

      if (!prev.isBatching) return prev;

      batchCountRef.current = Math.max(0, batchCountRef.current - 1);

      if (batchCountRef.current > 0 && !errorInWithBatchRef.current) {
        return prev;
      }

      errorInWithBatchRef.current = false;
      batchCountRef.current = 0;

      if (!batchInitialValueRef.current) {
        return {
          ...prev,
          isBatching: false,
        };
      }

      if (equalFn(batchInitialValueRef.current, prev.present)) {
        batchInitialValueRef.current = null;
        batchLastValueRef.current = null;

        return {
          ...prev,
          isBatching: false,
        };
      }

      if (onSet && batchLastValueRef.current) {
        onSet(batchInitialValueRef.current, batchLastValueRef.current);
      }

      if (
        prev.past.length === 0 ||
        !equalFn(
          decompressFn(prev.past[prev.past.length - 1], prev.isCompressed),
          batchInitialValueRef.current
        )
      ) {
        const storedInitialValue = compressHistory
          ? compress(batchInitialValueRef.current)
          : safeStructuredClone(batchInitialValueRef.current);
        const newPast = [...prev.past, storedInitialValue];

        batchInitialValueRef.current = null;
        batchLastValueRef.current = null;

        const limitedPast =
          maxHistorySize && newPast.length > maxHistorySize
            ? newPast.slice(-maxHistorySize)
            : newPast;

        return {
          past: limitedPast,
          present: prev.present,
          future: [],
          isCompressed: compressHistory,
          isBatching: false,
        };
      }

      batchInitialValueRef.current = null;
      batchLastValueRef.current = null;

      return {
        ...prev,
        isBatching: false,
      };
    });
  }, [decompressFn]);

  const withBatch = useCallback(
    <R>(fn: (state: T) => R): R => {
      try {
        startBatch();

        const result = fn(state.present);

        endBatch();

        return result;
      } catch (error) {
        errorInWithBatchRef.current = true;
        endBatch();

        throw error;
      }
    },
    [startBatch, endBatch, state.present]
  );

  const historyData = useMemo((): History<T> => {
    const stateIsCompressed = isCompressed(state);

    return {
      past: state.past.map((item) => decompressFn(item, stateIsCompressed)),
      future: state.future.map((item) => decompressFn(item, stateIsCompressed)),
    };
  }, [state, decompressFn, isCompressed]);

  return useMemo(
    () => ({
      state: state.present,
      set,
      undo,
      redo,
      reset,
      startBatch,
      endBatch,
      withBatch,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      history: historyData,
      isCompressed: state.isCompressed,
    }),
    [
      state,
      set,
      undo,
      redo,
      reset,
      startBatch,
      endBatch,
      withBatch,
      historyData,
    ]
  );
};
