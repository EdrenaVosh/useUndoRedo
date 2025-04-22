# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-04-23

### Fixes

- Support commonJS and module types

## [2.1.0] - 2025-04-23

### Changed

- Optimized history data management with lazy decompression for improved memory usage
- Improved error handling in batch operations with enhanced cleanup
- Optimized `structuredClone` detection with a one-time check instead of per-call

### Fixed

- Fixed potential memory leaks in batch operations
- Improved nested batch operations handling
- Enhanced TypeScript typings for better developer experience

## [2.0.0] - 2025-04-22

### Added

- **Batch Changes API**: Added new functionality for grouping changes into a single history entry.
  - `startBatch()`: starts grouping changes
  - `endBatch()`: completes grouping changes
  - `withBatch(fn)`: executes a function with change grouping and error handling
- Support for nested change groups
- Automatic merging of multiple `set()` calls into a single history entry
- The `onSet` callback is called only once for the entire group of changes
- Error handling during batching: state is preserved even when errors occur

### Changed

- Modified the basic UndoRedoState structure to support batching mode
- Changed the logic of `set()`, `undo()` and `redo()` to support grouping
- Updated documentation with examples of using the new API
- Improved typing for all public functions

### Fixed

- Fixed potential compression issues when working with groups of changes
- Improved handling of object references to prevent memory leaks

## [1.2.0] - 2023-05-10

### Added

- Added callbacks for tracking changes: `onSet`, `onUndo` and `onRedo`
- Improved typing of return values

### Fixed

- Fixed issues with history compression
- Improved performance when working with large objects

## [1.1.0] - 2023-03-15

### Added

- Added `compressHistory` option for memory optimization
- Improved object equality support via `equalFn`

### Changed

- Optimized handling of large data
- Improved TypeScript support

## [1.0.0] - 2023-01-20

### Added

- First stable version of the hook
- Basic functions: `set`, `undo`, `redo`, `reset`
- Support for limiting history size via `maxHistorySize`
- Full TypeScript typing
- Documentation and usage examples
