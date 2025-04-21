import { renderHook, act } from '@testing-library/react-hooks';
import { useUndoRedo } from './useUndoRedo';

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
});
