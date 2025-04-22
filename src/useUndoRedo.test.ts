import { renderHook, act } from '@testing-library/react-hooks';
import { useUndoRedo } from './useUndoRedo';

global.structuredClone = jest.fn((val) => JSON.parse(JSON.stringify(val)));

const originalStringify = JSON.stringify;
const originalParse = JSON.parse;

describe('useUndoRedo', () => {
  beforeEach(() => {
    JSON.stringify = jest
      .fn()
      .mockImplementation(
        originalStringify
      ) as unknown as typeof JSON.stringify;
    JSON.parse = jest
      .fn()
      .mockImplementation(originalParse) as unknown as typeof JSON.parse;
  });

  afterEach(() => {
    JSON.stringify = originalStringify;
    JSON.parse = originalParse;
    jest.clearAllMocks();
  });

  it('should have initial value', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    expect(result.current.state).toBe('initial');
  });

  it('should update value when set is called', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('new value');
    });

    expect(result.current.state).toBe('new value');
  });

  it('should have correct canUndo and canRedo flags', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.set('new value');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should correctly perform undo', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
    });

    expect(result.current.state).toBe('state 2');

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('state 1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it('should correctly perform redo', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('state 1');

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toBe('state 2');
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future states when setting new value after undo', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.set('new state');
    });

    expect(result.current.canRedo).toBe(false);
  });

  it('should correctly perform reset', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
    });

    act(() => {
      result.current.reset('reset value');
    });

    expect(result.current.state).toBe('reset value');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should limit history size when maxHistorySize is set', () => {
    const { result } = renderHook(() =>
      useUndoRedo('initial', { maxHistorySize: 2 })
    );

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
      result.current.set('state 3');
    });

    expect(result.current.history.past).toHaveLength(2);
    expect(result.current.history.past).toEqual(['state 1', 'state 2']);
    expect(result.current.state).toBe('state 3');

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toBe('state 2');
    expect(result.current.history.past).toHaveLength(1);
    expect(result.current.history.past).toEqual(['state 1']);
  });

  it('should not limit history size when maxHistorySize is not set', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
      result.current.set('state 3');
      result.current.set('state 4');
    });

    expect(result.current.history.past).toHaveLength(4);
    expect(result.current.history.past).toEqual([
      'initial',
      'state 1',
      'state 2',
      'state 3',
    ]);
    expect(result.current.state).toBe('state 4');
  });

  it('should work correctly with objects', () => {
    const { result } = renderHook(() => useUndoRedo({ name: 'John', age: 25 }));

    act(() => {
      result.current.set({ name: 'John', age: 26 });
      result.current.set({ name: 'Jane', age: 26 });
    });

    expect(result.current.state).toEqual({ name: 'Jane', age: 26 });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ name: 'John', age: 26 });
  });

  it('should use custom equality function', () => {
    const equalFn = jest.fn((a, b) => JSON.stringify(a) === JSON.stringify(b));
    const { result } = renderHook(() =>
      useUndoRedo({ items: [1, 2] }, { equalFn })
    );

    act(() => {
      result.current.set({ items: [1, 2] });
    });

    expect(equalFn).toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);

    act(() => {
      result.current.set({ items: [1, 2, 3] });
    });

    expect(result.current.canUndo).toBe(true);
  });

  it('should compress history when compressHistory is enabled', () => {
    const { result } = renderHook(() =>
      useUndoRedo({ name: 'John', age: 25 }, { compressHistory: true })
    );

    expect(result.current.isCompressed).toBe(true);

    (JSON.stringify as jest.Mock).mockClear();

    act(() => {
      result.current.set({ name: 'Jane', age: 26 });
    });

    expect(JSON.stringify).toHaveBeenCalled();

    act(() => {
      result.current.undo();
    });

    expect(JSON.parse).toHaveBeenCalled();
    expect(result.current.state).toEqual({ name: 'John', age: 25 });
  });

  it('should not compress history when compressHistory is disabled', () => {
    const { result } = renderHook(() =>
      useUndoRedo({ name: 'John', age: 25 }, { compressHistory: false })
    );

    expect(result.current.isCompressed).toBe(false);

    act(() => {
      result.current.set({ name: 'Jane', age: 26 });
    });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ name: 'John', age: 25 });
  });

  it('should work correctly with compression during multiple undo/redo operations', () => {
    interface TestObject {
      data: Array<{ id: number; value: string }>;
      version?: number;
    }

    const largeObject: TestObject = {
      data: Array(100)
        .fill(0)
        .map((_, i) => ({ id: i, value: `value-${i}` })),
    };

    const { result } = renderHook(() =>
      useUndoRedo(largeObject, { compressHistory: true })
    );

    act(() => {
      result.current.set({ ...largeObject, version: 1 });
      result.current.set({ ...largeObject, version: 2 });
      result.current.set({ ...largeObject, version: 3 });
    });

    expect(result.current.state.version).toBe(3);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.state.version).toBe(1);

    act(() => {
      result.current.redo();
    });

    expect(result.current.state.version).toBe(2);

    act(() => {
      result.current.set({ ...largeObject, version: 4 });
    });

    expect(result.current.state.version).toBe(4);
    expect(result.current.canRedo).toBe(false);
  });

  it('should provide correct history when using compression', () => {
    const { result } = renderHook(() =>
      useUndoRedo('initial', { compressHistory: true })
    );

    act(() => {
      result.current.set('state 1');
      result.current.set('state 2');
      result.current.set('state 3');
    });

    expect(result.current.history.past).toEqual([
      'initial',
      'state 1',
      'state 2',
    ]);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.history.past).toEqual(['initial']);
    expect(result.current.history.future).toEqual(['state 2', 'state 3']);
    expect(result.current.state).toBe('state 1');
  });

  it('should call onSet callback when value is set', () => {
    type TestType = string;
    const onSet = jest.fn<void, [TestType, TestType]>();
    const { result } = renderHook(() =>
      useUndoRedo<TestType>('initial', { onSet })
    );

    act(() => {
      result.current.set('new value');
    });

    expect(onSet).toHaveBeenCalledWith('initial', 'new value');
  });

  it('should call onUndo callback when undo is performed', () => {
    type TestType = string;
    const onUndo = jest.fn<void, [TestType, TestType]>();
    const { result } = renderHook(() =>
      useUndoRedo<TestType>('initial', { onUndo })
    );

    act(() => {
      result.current.set('state 1');
    });

    act(() => {
      result.current.undo();
    });

    expect(onUndo).toHaveBeenCalledWith('state 1', 'initial');
  });

  it('should call onRedo callback when redo is performed', () => {
    type TestType = string;
    const onRedo = jest.fn<void, [TestType, TestType]>();
    const { result } = renderHook(() =>
      useUndoRedo<TestType>('initial', { onRedo })
    );

    act(() => {
      result.current.set('state 1');
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.redo();
    });

    expect(onRedo).toHaveBeenCalledWith('initial', 'state 1');
  });

  it('should work with all callbacks together', () => {
    type TestType = string;
    const onSet = jest.fn<void, [TestType, TestType]>();
    const onUndo = jest.fn<void, [TestType, TestType]>();
    const onRedo = jest.fn<void, [TestType, TestType]>();

    const { result } = renderHook(() =>
      useUndoRedo<TestType>('initial', {
        onSet,
        onUndo,
        onRedo,
      })
    );

    act(() => {
      result.current.set('state 1');
    });
    expect(onSet).toHaveBeenCalledWith('initial', 'state 1');

    act(() => {
      result.current.undo();
    });
    expect(onUndo).toHaveBeenCalledWith('state 1', 'initial');

    act(() => {
      result.current.redo();
    });
    expect(onRedo).toHaveBeenCalledWith('initial', 'state 1');

    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  describe('batch changes', () => {
    it('should group multiple changes in a single history entry with startBatch/endBatch', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0, text: '' }));

      act(() => {
        result.current.startBatch();
        result.current.set({ count: 1, text: '' });
        result.current.set({ count: 1, text: 'a' });
        result.current.set({ count: 2, text: 'a' });
        result.current.endBatch();
      });

      expect(result.current.state).toEqual({ count: 2, text: 'a' });

      expect(result.current.history.past).toHaveLength(1);
      expect(result.current.history.past[0]).toEqual({ count: 0, text: '' });

      act(() => {
        result.current.undo();
      });

      expect(result.current.state).toEqual({ count: 0, text: '' });
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should handle withBatch function for grouped operations', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0, text: '' }));

      act(() => {
        result.current.withBatch((state) => {
          result.current.set({ count: state.count + 1, text: state.text });
          result.current.set({
            count: state.count + 1,
            text: state.text + 'a',
          });

          return 'batch completed';
        });
      });

      expect(result.current.state).toEqual({ count: 1, text: 'a' });

      expect(result.current.history.past).toHaveLength(1);
      expect(result.current.history.past[0]).toEqual({ count: 0, text: '' });
    });

    it('should handle nested batch operations correctly', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0, text: '' }));

      act(() => {
        result.current.startBatch();

        result.current.set({ count: 1, text: '' });

        result.current.withBatch(() => {
          result.current.set({ count: 2, text: 'a' });
          result.current.set({ count: 3, text: 'ab' });
        });

        result.current.set({ count: 4, text: 'abc' });

        result.current.endBatch();
      });

      expect(result.current.state).toEqual({ count: 4, text: 'abc' });

      expect(result.current.history.past).toHaveLength(1);
      expect(result.current.history.past[0]).toEqual({ count: 0, text: '' });
    });

    it('should not create history entry if no changes in batch', () => {
      const { result } = renderHook(() => useUndoRedo('initial'));

      act(() => {
        result.current.startBatch();
        result.current.endBatch();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.history.past).toHaveLength(0);
    });

    it('should create history entry when using custom equality function', () => {
      const equalFn = jest.fn(
        (a: { id: number }, b: { id: number }) => a.id === b.id
      );
      const { result } = renderHook(() =>
        useUndoRedo({ id: 1, count: 0 }, { equalFn })
      );

      act(() => {
        result.current.set({ id: 1, count: 0 });
      });

      act(() => {
        result.current.startBatch();
        result.current.set({ id: 1, count: 1 });
        result.current.set({ id: 1, count: 2 });
        result.current.endBatch();
      });

      expect(result.current.state.id).toBe(1);

      expect(equalFn).toHaveBeenCalled();

      expect(result.current.canUndo).toBe(false);
    });

    it('should call onSet callback only once for batched changes', () => {
      type TestType = { count: number; text: string };
      const onSet = jest.fn<void, [TestType, TestType]>();

      const { result } = renderHook(() =>
        useUndoRedo<TestType>({ count: 0, text: '' }, { onSet })
      );

      act(() => {
        result.current.startBatch();
        result.current.set({ count: 1, text: '' });
        result.current.set({ count: 2, text: 'a' });
        result.current.endBatch();
      });

      expect(onSet).toHaveBeenCalledTimes(1);
      expect(onSet).toHaveBeenCalledWith(
        { count: 0, text: '' },
        { count: 2, text: 'a' }
      );
    });

    it('should preserve state changes when error occurs in withBatch', () => {
      const { result } = renderHook(() => useUndoRedo({ count: 0 }));

      act(() => {
        result.current.set({ count: 0 });
      });

      try {
        act(() => {
          result.current.withBatch(() => {
            result.current.set({ count: 1 });
            throw new Error('Test error');
          });
        });
      } catch (error) {
        expect((error as Error).message).toBe('Test error');
      }

      expect(typeof result.current.state).toBe('object');
      expect(result.current.state).toHaveProperty('count');

      expect(result.current.canUndo).toBe(true);
    });
  });
});
