# useUndoRedo

A lightweight and performant React hook for implementing Undo/Redo functionality.

## Installation

```bash
npm install use-undo-redo-hook
# or
yarn add use-undo-redo-hook
```

## Features

- 🪶 Lightweight (~1KB)
- 🚀 Performant (uses useMemo and useCallback)
- 💪 Fully typed (written in TypeScript)
- 🎯 Simple API
- 🔄 Configurable history size
- 🧹 History cleanup capability
- 🎨 Complex objects support (via structuredClone)
- ⚡ Performance optimization (skips identical values)
- 🔍 Customizable value comparison function

## Usage

```typescript
import { useUndoRedo } from "use-undo-redo-hook";

function TextEditor() {
  const {
    state, // current value
    set, // function to update value
    undo, // undo last action
    redo, // redo last undone action
    reset, // reset history and set new value
    canUndo, // whether undo is possible
    canRedo, // whether redo is possible
    history, // history object {past: [], future: []}
  } = useUndoRedo("", { maxHistorySize: 100 });

  return (
    <div>
      <textarea value={state} onChange={(e) => set(e.target.value)} />
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={() => reset("")}>Reset</button>
    </div>
  );
}
```

## API

### `useUndoRedo<T>(initialValue: T, options?: Options<T>)`

#### Parameters

- `initialValue: T` - initial value
- `options` - configuration object
  - `maxHistorySize?: number` - maximum history size
  - `equalFn?: (a: T, b: T) => boolean` - value comparison function (defaults to ===)

#### Return Values

- `state: T` - current value
- `set: (newValue: T) => void` - function to update value
- `undo: () => void` - undo last action
- `redo: () => void` - redo last undone action
- `reset: (value: T) => void` - reset history and set new value
- `canUndo: boolean` - whether undo is possible
- `canRedo: boolean` - whether redo is possible
- `history: { past: T[], future: T[] }` - history states

## Examples

### Drawing Editor

```typescript
interface Point {
  x: number;
  y: number;
}

function DrawingCanvas() {
  const { state, set, undo, redo, canUndo, canRedo } = useUndoRedo<Point[]>([], {
    // Custom comparison function for point arrays
    equalFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  const handleDraw = (point: Point) => {
    set([...state, point]);
  };

  return (
    <div>
      <canvas
        onPointerMove={(e) => handleDraw({ x: e.clientX, y: e.clientY })}
      />
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}
```

### Form Management

```typescript
interface FormData {
  name: string;
  email: string;
}

function Form() {
  const {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo
  } = useUndoRedo<FormData>(
    {
      name: "",
      email: "",
    },
    {
      maxHistorySize: 50, // Limit history size
    }
  );

  const handleReset = () => {
    reset({ name: "", email: "" });
  };

  return (
    <form>
      <input
        value={state.name}
        onChange={(e) => set({ ...state, name: e.target.value })}
      />
      <input
        value={state.email}
        onChange={(e) => set({ ...state, email: e.target.value })}
      />
      <button type="button" onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <button type="button" onClick={handleReset}>
        Reset
      </button>
    </form>
  );
}
```

## Internal Structure

- The hook maintains three arrays: `past` (previous states), `present` (current state), and `future` (undone states).
- When updating value through `set`:
  - Current state is added to `past`
  - New value becomes `present`
  - `future` is cleared
- When performing `undo`:
  - Last state from `past` becomes `present`
  - `present` is added to the beginning of `future`
- When performing `redo`:
  - First state from `future` becomes `present`
  - `present` is added to the end of `past`
- All state changes are performed using `structuredClone` for deep object copying

## License

MIT
