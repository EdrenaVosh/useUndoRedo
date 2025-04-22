# useUndoRedo

A lightweight and performant React hook for implementing Undo/Redo functionality.

## Installation

```bash
npm install use-undo-redo-hook
# or
yarn add use-undo-redo-hook
```

## Features

- 🪶 Lightweight (< 10KB gzip)
- 🚀 Performant (uses useMemo and useCallback)
- 💪 Fully typed (written in TypeScript)
- 🎯 Simple API
- 🔄 Configurable history size
- 🧹 History cleanup capability
- 🎨 Complex objects support (via structuredClone)
- ⚡ Performance optimization (skips identical values)
- 🔍 Customizable value comparison function
- 📦 Memory optimization with history compression
- 🔔 Event callbacks for undo/redo operations
- 🔗 Batch operations for grouping related changes
- 🧠 Lazy history decompression for minimal memory footprint

## Usage

```typescript
import { useUndoRedo } from 'use-undo-redo-hook';

function TextEditor() {
  const {
    state, // current value
    set, // function to update value
    undo, // undo last action
    redo, // redo last undone action
    reset, // reset history and set new value
    startBatch, // start grouping changes
    endBatch, // end grouping changes
    withBatch, // execute a function with grouped changes
    canUndo, // whether undo is possible
    canRedo, // whether redo is possible
    history, // history object {past: [], future: []}
  } = useUndoRedo('', { maxHistorySize: 100 });

  return (
    <div>
      <textarea value={state} onChange={(e) => set(e.target.value)} />
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <button onClick={() => reset('')}>Reset</button>
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
  - `compressHistory?: boolean` - enable history compression to reduce memory usage (defaults to false)
  - `onUndo?: (prevState: T, nextState: T) => void` - callback triggered when undo is performed
  - `onRedo?: (prevState: T, nextState: T) => void` - callback triggered when redo is performed
  - `onSet?: (prevState: T, nextState: T) => void` - callback triggered when set is called

#### Return Values

- `state: T` - current value
- `set: (newValue: T) => void` - function to update value
- `undo: () => void` - undo last action
- `redo: () => void` - redo last undone action
- `reset: (value: T) => void` - reset history and set new value
- `startBatch: () => void` - start grouping changes as a single history entry
- `endBatch: () => void` - end grouping changes
- `withBatch: <R>(fn: (state: T) => R) => R` - execute a function with grouped changes
- `canUndo: boolean` - whether undo is possible
- `canRedo: boolean` - whether redo is possible
- `history: { past: T[], future: T[] }` - history states
- `isCompressed: boolean` - whether history compression is enabled

## Examples

### Drawing Editor

```typescript
interface Point {
  x: number;
  y: number;
}

function DrawingCanvas() {
  const { state, set, undo, redo, canUndo, canRedo } = useUndoRedo<Point[]>(
    [],
    {
      // Custom comparison function for point arrays
      equalFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      // Enable compression for memory optimization
      compressHistory: true,
    }
  );

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

### Form Management with Callbacks

```typescript
interface FormData {
  name: string;
  email: string;
}

function Form() {
  // Track whether changes are saved
  const [isSaved, setIsSaved] = useState(true);

  const { state, set, undo, redo, reset, canUndo, canRedo } =
    useUndoRedo<FormData>(
      {
        name: '',
        email: '',
      },
      {
        maxHistorySize: 50, // Limit history size
        compressHistory: true, // Optimize memory for large forms
        onSet: () => {
          // Mark form as unsaved when changes are made
          setIsSaved(false);
        },
        onUndo: () => {
          // Mark form as unsaved after undo
          setIsSaved(false);
        },
        onRedo: () => {
          // Mark form as unsaved after redo
          setIsSaved(false);
        },
      }
    );

  const handleSave = () => {
    // Save form data to server
    saveFormData(state).then(() => {
      setIsSaved(true);
    });
  };

  const handleReset = () => {
    reset({ name: '', email: '' });
    setIsSaved(true);
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
      <button type="button" onClick={handleSave} disabled={isSaved}>
        Save
      </button>
      {!isSaved && <span>Unsaved changes</span>}
    </form>
  );
}
```

### Batch Changes for Complex Operations

```typescript
interface TodoList {
  items: { id: number; text: string; completed: boolean }[];
}

function TodoApp() {
  const {
    state,
    set,
    startBatch,
    endBatch,
    withBatch,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<TodoList>({ items: [] });

  // Group multiple changes as a single history entry
  const completeAllTodos = () => {
    startBatch();

    const newItems = state.items.map((item) => ({ ...item, completed: true }));
    set({ items: newItems });

    endBatch();
  };

  // Alternative approach using withBatch
  const clearCompletedTodos = () => {
    withBatch(() => {
      const newItems = state.items.filter((item) => !item.completed);
      set({ items: newItems });
      return true; // Return value from the batch function
    });
  };

  // Normal state update (will create a separate history entry)
  const addTodo = (text: string) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
    };

    set({
      items: [...state.items, newTodo],
    });
  };

  return (
    <div>
      <button onClick={() => addTodo('New Todo')}>Add Todo</button>
      <button onClick={completeAllTodos}>Complete All</button>
      <button onClick={clearCompletedTodos}>Clear Completed</button>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>

      <ul>
        {state.items.map((item) => (
          <li
            key={item.id}
            style={{ textDecoration: item.completed ? 'line-through' : 'none' }}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Internal Structure

- The hook maintains three arrays: `past` (previous states), `present` (current state), and `future` (undone states).
- When updating value through `set`:
  - Current state is added to `past`
  - New value becomes `present`
  - `future` is cleared
  - `onSet` callback is triggered if provided
- When performing `undo`:
  - Last state from `past` becomes `present`
  - `present` is added to the beginning of `future`
  - `onUndo` callback is triggered if provided
- When performing `redo`:
  - First state from `future` becomes `present`
  - `present` is added to the end of `past`
  - `onRedo` callback is triggered if provided
- When using batch operations with `startBatch`/`endBatch` or `withBatch`:
  - Multiple `set` calls between `startBatch` and `endBatch` are treated as a single change
  - Only the initial state before the batch is added to history
  - `onSet` is triggered only once with the initial and final state
- All state changes are performed using `structuredClone` for deep object copying
- When `compressHistory` is enabled, states are stored as JSON strings to reduce memory usage
- History items are lazily decompressed when accessed, improving memory usage

## Advanced Usage

### Memory Optimization

For large objects or long histories, you can enable history compression:

```typescript
const { state, set, undo, redo } = useUndoRedo(initialValue, {
  compressHistory: true,
});
```

This will store past and future states as JSON strings, reducing memory usage at the cost of slight CPU overhead for serialization/deserialization.

Starting from version 2.0.1, the hook uses lazy decompression to further optimize memory usage. This means history items are only decompressed when they are actually accessed, not when the history object is created, significantly reducing memory consumption for large histories.

### Error Handling in Batch Operations

The hook provides robust error handling for batch operations. When using `withBatch`, any errors that occur during the batch operation are properly caught and rethrown, while ensuring the batch state is properly cleaned up:

```typescript
try {
  withBatch(() => {
    set({ ...state, step1: true });

    // If an error occurs here, the batch state is still properly cleaned up
    performOperationThatMightFail();

    set({ ...state, step1: true, step2: true });
  });
} catch (error) {
  // Handle error
  console.error('Batch operation failed:', error);

  // The current state reflects the last successful set operation
  // and the history is properly maintained
}
```

### Batch Changes for Complex Operations

When you need to make several related changes that should be treated as a single operation in the history:

```typescript
const { state, set, startBatch, endBatch, withBatch } =
  useUndoRedo(initialValue);

// Method 1: Using startBatch and endBatch
const handleComplexChange = () => {
  startBatch();

  // Multiple set calls that should be grouped as one history entry
  set({ ...state, prop1: 'value1' });
  set({ ...state, prop1: 'value1', prop2: 'value2' });

  endBatch();
};

// Method 2: Using withBatch for cleaner code
const handleAnotherComplexChange = () => {
  withBatch(() => {
    set({ ...state, prop1: 'new value' });
    set({ ...state, prop1: 'new value', prop2: 'new value2' });

    // You can return a value from the batch function
    return 'Operation completed';
  });
};
```

The `withBatch` function ensures that `endBatch` is called even if an error occurs inside the batch, making it safer to use for error handling.

### Integration with Backend

You can use callbacks to synchronize changes with a backend:

```typescript
const { state, set } = useUndoRedo(initialValue, {
  onSet: (prevState, newState) => {
    // Send changes to backend
    api.updateData(newState);
  },
  onUndo: (prevState, newState) => {
    // Notify backend about undo
    api.updateData(newState);
  },
  onRedo: (prevState, newState) => {
    // Notify backend about redo
    api.updateData(newState);
  },
});
```

## License

MIT
