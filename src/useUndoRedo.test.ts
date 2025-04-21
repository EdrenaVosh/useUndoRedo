import { renderHook, act } from '@testing-library/react-hooks';
import { useUndoRedo } from './useUndoRedo';

global.structuredClone = jest.fn((val) => JSON.parse(JSON.stringify(val)));

describe('useUndoRedo', () => {
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
      result.current.set('state 1'); // past: ['initial']
      result.current.set('state 2'); // past: ['initial', 'state 1']
      result.current.set('state 3'); // past: ['state 1', 'state 2'] - 'initial' is removed
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

    // Без ограничения все состояния должны сохраниться
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
});
