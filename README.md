# useUndoRedo

Lightweight and performant React hook for implementing Undo/Redo functionality.

## Installation

```bash
npm install use-undo-redo-hook
# or
yarn add use-undo-redo-hook
```

## Features

- 🪶 Lightweight (~1KB)
- 🚀 Performant (uses React.useCallback)
- 💪 Fully typed (written in TypeScript)
- 🎯 Simple API
- 🔄 Configurable history size
- 🧹 History clearing capability

## Usage

```typescript
import { useUndoRedo } from "use-undo-redo-hook";

function TextEditor() {
  const {
    state, // current value
    setState, // function to update value
    undo, // undo last action
    redo, // redo last undone action
    canUndo, // whether undo is possible
    canRedo, // whether redo is possible
    clearHistory, // clear history
    history, // history object {past: [], future: []}
  } = useUndoRedo("", { maxHistorySize: 100 });

  return (
    <div>
      <textarea value={state} onChange={(e) => setState(e.target.value)} />
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={clearHistory}>Clear History</button>
    </div>
  );
}
```

## API

### `useUndoRedo<T>(initialState: T, options?: Options)`

#### Parameters

- `initialState: T` - initial state
- `options` - configuration object
  - `maxHistorySize?: number` - maximum history size (default 100)

#### Return Values

- `state: T` - current state
- `setState: (newState: T) => void` - function to update state
- `undo: () => void` - undo last action
- `redo: () => void` - redo last undone action
- `canUndo: boolean` - whether undo is possible
- `canRedo: boolean` - whether redo is possible
- `history: { past: T[], future: T[] }` - history states
- `clearHistory: () => void` - clear history

## Examples

### Drawing Editor

```typescript
interface Point {
  x: number;
  y: number;
}

function DrawingCanvas() {
  const { state, setState, undo, redo } = useUndoRedo<Point[]>([]);

  const handleDraw = (point: Point) => {
    setState([...state, point]);
  };

  return (
    <div>
      <canvas
        onPointerMove={(e) => handleDraw({ x: e.clientX, y: e.clientY })}
      />
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
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
  const { state, setState, undo, redo } = useUndoRedo<FormData>({
    name: "",
    email: "",
  });

  return (
    <form>
      <input
        value={state.name}
        onChange={(e) => setState({ ...state, name: e.target.value })}
      />
      <input
        value={state.email}
        onChange={(e) => setState({ ...state, email: e.target.value })}
      />
      <button type="button" onClick={undo}>
        Undo
      </button>
      <button type="button" onClick={redo}>
        Redo
      </button>
    </form>
  );
}
```

## License

MIT
