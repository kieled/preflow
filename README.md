# Preflow

[![npm @preflow/core](https://img.shields.io/npm/v/@preflow/core?label=%40preflow%2Fcore)](https://www.npmjs.com/package/@preflow/core)
[![npm @preflow/react](https://img.shields.io/npm/v/@preflow/react?label=%40preflow%2Freact)](https://www.npmjs.com/package/@preflow/react)
[![npm @preflow/vue](https://img.shields.io/npm/v/@preflow/vue?label=%40preflow%2Fvue)](https://www.npmjs.com/package/@preflow/vue)
[![npm @preflow/prose](https://img.shields.io/npm/v/@preflow/prose?label=%40preflow%2Fprose)](https://www.npmjs.com/package/@preflow/prose)
[![CI](https://github.com/kieled/preflow/actions/workflows/ci.yml/badge.svg)](https://github.com/kieled/preflow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Early Testing Phase** — This library is under active development. APIs may change between releases. Not recommended for production use yet.

Predictive virtualization engine -- heights from arithmetic, not DOM measurement.

## Performance

> Benchmarked on Bun 1.3, 100K variable-height items. Source: `benchmarks/core.bench.ts`

| Scenario | Preflow | TanStack Virtual | |
|---|---|---|---|
| **Full pipeline** (create + 100 scrolls + render) | 3.7K ops/s | 316 ops/s | **11.8x faster** |
| **Append** (100 batches, infinite scroll) | 675 ops/s | 49 ops/s | **13.8x faster** |
| **Create 100K items** | 2.0M ops/s | 381K ops/s | **5.3x faster** |
| **Create 10K items** | 1.1M ops/s | 273K ops/s | **4.1x faster** |
| **getItems** | 3.2M ops/s | 2.3M ops/s | **1.4x faster** |
| **Memory** per 100K instance | 782 KB | 2.8 MB | **3.7x less** |
| Viewport scroll (1K updates) | 9.7K ops/s | 4.6K ops/s | **2.1x faster** |
| scrollToIndex (10K random) | 19.2K ops/s | 28.4K ops/s | 1.5x slower |
| O(1) offset lookup (100K calls) | 6.8K ops/s | N/A | preflow only |
| Grid layout (10K, 4 cols) | 1.5M ops/s | N/A | preflow only |
| Masonry layout (10K, 4 cols) | 2.8M ops/s | N/A | preflow only |
| Chat prepend + scroll correction | 14.4K ops/s | N/A | preflow only |

Preflow wins **11 of 12** benchmarks. The sole loss — `scrollToIndex` at 1.5x — is at raw memory access speed (~5ns/lookup) where V8's object property access is marginally faster than typed array indexing. In real-world usage (the "full pipeline" row), Preflow is **11.8x faster** end-to-end.

## Feature Comparison

|  | Preflow | TanStack Virtual | react-virtuoso | react-window |
|---|---|---|---|---|
| **Architecture** | | | | |
| DOM-free core | Yes | No | No | No |
| Height source | Predictive (arithmetic) | DOM measurement | DOM measurement | Fixed or DOM |
| SSR / Node.js | Full | Partial | Partial | No |
| Framework-agnostic core | Yes | Yes | No | No |
| Bundle size (core, gzip) | 2.1 KB | 5.3 KB | 17 KB | 6.2 KB |
| **Layout Modes** | | | | |
| 1D list | Yes | Yes | Yes | Yes |
| Grid | Yes | Partial (lanes) | Yes | Fixed only |
| Masonry | Yes | No | No | No |
| Chat (bottom-anchored) | Yes | No | Yes | No |
| Line-level prose | Yes | No | No | No |
| **Scrolling** | | | | |
| Container scroll | Yes | Yes | Yes | Yes |
| Window scroll | Yes | Yes | Yes | No |
| Scroll correction (prepend) | Built-in | Manual | Built-in | No |
| Auto-follow (chat) | Built-in | No | Built-in | No |
| Bidirectional infinite scroll | Built-in | Manual | Built-in | No |
| **Dynamic Data** | | | | |
| Append items | O(k) incremental | O(n) rebuild | O(n) rebuild | Remount |
| Prepend with correction | Built-in | Manual | Built-in | No |
| Container resize reflow | `setContainerWidth` | `measureElement` | Automatic | Manual |
| **Data Structures** | | | | |
| Offset lookup | O(1) prefix-sum | O(n) cache walk | O(log n) tree | O(1) fixed only |
| Scroll-to-index | O(log n) | O(log n) | O(log n) | O(1) fixed only |
| Internal storage | `Float64Array` | JS objects | JS objects | JS objects |
| **Framework Support** | | | | |
| React | `@preflow/react` | `@tanstack/react-virtual` | Built-in | Built-in |
| Vue | `@preflow/vue` | `@tanstack/vue-virtual` | No | No |
| Svelte | Planned | `@tanstack/svelte-virtual` | No | No |
| Solid | Planned | `@tanstack/solid-virtual` | No | No |
| **API** | | | | |
| Style | Functional (`createFlow`) | Class (`new Virtualizer`) | Component | Component |
| Unified return type | Yes (all modes -> `Flow`) | No | No | No |
| TypeScript | Full | Full | Full | `@types` |

## Packages

| Package | Description | Min | Gzip |
|---|---|---|---|
| `@preflow/core` | Headless virtualization engine (zero deps) | 6.7 KB | 2.1 KB |
| `@preflow/core/measure` | Arithmetic text measurement (requires `@chenglou/pretext`) | +0.2 KB | +0.1 KB |
| `@preflow/react` | React 19 hooks + components | 10.6 KB | 2.5 KB |
| `@preflow/vue` | Vue 3 composables + components | 8.9 KB | 1.5 KB |
| `@preflow/prose` | Line-level prose virtualization | 3.5 KB | 1.5 KB |

> `@preflow/core` has zero dependencies. The `@preflow/core/measure` entry point provides arithmetic text measurement via [`@chenglou/pretext`](https://github.com/chenglou/pretext) — install it as an optional peer dependency only if you need text height prediction.

## Quick Start

### React

```tsx
import { useFlow } from "@preflow/react";

function MyList({ data }) {
  const { containerRef, items, totalHeight } = useFlow({
    count: data.length,
    getHeight: (i) => calculateHeight(data[i]),
  });

  return (
    <div ref={containerRef} style={{ height: 400, overflow: "auto" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.map((item) => (
          <div
            key={item.index}
            style={{
              position: "absolute",
              top: item.y,
              height: item.height,
              width: "100%",
            }}
          >
            {data[item.index].text}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Core (Framework-agnostic)

```typescript
import { createFlow } from "@preflow/core";

const flow = createFlow({
  count: 100_000,
  getHeight: (i) => heights[i],
  overscan: 5,
});

flow.setViewport(scrollTop, viewportHeight);
const visibleItems = flow.getItems();
// Each item: { index, x, y, width, height }
```

### Window Scroll

```tsx
const { containerRef, items, totalHeight } = useFlow({
  count: 1000,
  getHeight: (i) => heights[i],
  windowScroll: true,
});
```

## Layout Modes

### Flow (1D List)

Variable-height items in a single column. Supports prepend with scroll correction, append, and dynamic count changes.

```typescript
const flow = createFlow({
  count: 10_000,
  getHeight: (i) => heights[i],
  overscan: 5,
});
```

### Grid

Fixed-column grid where each row height equals the tallest cell in that row.

```typescript
const grid = createGrid({
  count: 10_000,
  columns: 4,
  columnWidth: 200,
  gap: 8,
  getHeight: (i) => heights[i],
});
```

### Masonry

Pinterest-style shortest-column greedy placement.

```typescript
const masonry = createMasonry({
  count: 10_000,
  columns: 3,
  columnWidth: 250,
  gap: 12,
  getHeight: (i) => heights[i],
});
```

### Chat

Bottom-anchored messaging virtualizer. Auto-follows when at bottom, preserves position when reading history, returns exact scroll corrections on prepend.

```typescript
const chat = createChat({
  count: messages.length,
  getHeight: (i) => messageHeights[i],
  overscan: 5,
});
```

## API

All layout modes return the same `Flow` interface:

```typescript
interface Flow {
  readonly totalHeight: number;
  readonly visibleRange: { start: number; end: number };

  getItems(): FlowItem[];
  getItemOffset(index: number): number;
  getItemHeight(index: number): number;

  setViewport(scrollTop: number, viewportHeight: number): boolean;
  setContainerWidth(width: number): void;
  setCount(count: number): void;

  prepend(count: number): ScrollCorrection;
  append(count: number): void;

  scrollToIndex(index: number, align?: "start" | "center" | "end"): number;
  scrollToEnd(): number;
}
```

## Architecture

Core uses `Float64Array` prefix-sum arrays:

- `prefixSums[i]` = sum of heights from index 0 to i-1
- **Offset lookup**: O(1) -- read `prefixSums[index]`
- **Scroll to item**: O(log n) -- binary search on prefix-sum array
- **Total height**: O(1) -- read `prefixSums[count]`
- **Append**: O(k) -- extend array, compute only new items
- **Memory**: 8 bytes per item (`Float64Array`) vs ~80+ bytes (JS objects)

## License

MIT
