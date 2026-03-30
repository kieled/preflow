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

### Core (headless, no React/DOM)

> Benchmarked on Bun 1.3, 100K variable-height items. Source: `benchmarks/core.bench.ts`
>
> These benchmarks test the **headless virtualizer cores** in isolation — no React rendering, no DOM updates, no browser paint. They measure raw computation speed, not end-to-end scroll performance. See [Browser](#browser-playwright-vsync-uncapped-100k-items) for real-world rendering benchmarks.

| Scenario | Preflow | TanStack Virtual | |
|---|---|---|---|
| **Full pipeline** (create + 100 scrolls + render) | 2.6K ops/s | 225 ops/s | **11.2x faster** |
| **Append** (100 batches, infinite scroll) | 577 ops/s | 30 ops/s | **19.2x faster** |
| **Memory** per 100K instance | 782 KB | 7.2 MB | **9.5x less** |
| **Create 100K items** | 1.6M ops/s | 324K ops/s | **5.0x faster** |
| Viewport scroll (1K updates) | 11.3K ops/s | 2.4K ops/s | **4.6x faster** |
| getItems (memoized, same range) | 32.1M ops/s | 2.6M ops/s | **12.5x faster** |
| scrollToIndex (10K random) | 14.1K ops/s | 12.5K ops/s | **1.1x faster** |

> **Note on getItems**: Both libraries memoize results when range is unchanged. This row measures repeated reads at the same scroll position — useful for parent re-renders but not representative of the scroll hot path, where every call follows a range change. The "full pipeline" row is the most realistic core benchmark.

### Browser (Playwright, vsync uncapped, 100K items)

> Source: `benchmarks/browser.bench.ts`
>
> Full React rendering pipeline: scroll events → virtualizer → React reconciliation → DOM updates → browser paint. This is the closest to real-world performance.

| Test | Preflow | TanStack Virtual | react-virtuoso |
|---|---|---|---|
| **Scroll FPS** | 1,654 | 1,123 | 57 |
| **Scroll p95** | 1.0ms | 1.5ms | 18.2ms |
| **Grid resize FPS** | 431 | 351 | 979 |
| **Grid resize p95** | 4.4ms | 28.7ms | 1.5ms |
| **Grid resize drops** | 0 | 46 | 0 |

> **Caveats**:
> - All three libraries exceed 60 FPS for scroll (except Virtuoso). At real vsync rates, the practical difference between Preflow and TanStack is minimal.
> - FPS varies across machines and system load. Under heavy GC pressure, Preflow's advantage can shrink or invert because it allocates new item objects on each range change while TanStack reuses pre-built measurement objects.
> - Virtuoso's grid resize is fast because it uses CSS `flex-wrap` — the browser handles reflow natively with no JS grid calculation. The tradeoff: all items must be the same size (no variable row heights, no masonry). Preflow and TanStack compute layouts in JS to support variable heights and masonry.

### SSR (`renderToString`)

> Source: `benchmarks/ssr.bench.tsx`

| Items | Preflow | TanStack Virtual | react-virtuoso |
|---|---|---|---|
| **1K** | 22.0K ops/s | 5.8K ops/s (3.8x slower) | 1.9K ops/s (11.5x slower) |
| **10K** | 13.3K ops/s | 1.2K ops/s (10.9x slower) | 1.9K ops/s (7.2x slower) |

## Trade-offs

Preflow is built on a fundamental design choice: **heights come from arithmetic, not DOM measurement**. This makes it fast and portable (SSR, workers, non-browser environments), but it means:

- **You must know item heights upfront.** If content height depends on rendered DOM (images loading, text wrapping, user-resizable elements), you need to calculate or estimate heights yourself. TanStack and Virtuoso measure actual DOM elements automatically.
- **No dynamic height adjustment.** If an item's actual rendered height differs from `getHeight(i)`, Preflow won't detect or correct this. TanStack's `measureElement` handles this automatically.
- **Vertical only.** TanStack supports horizontal lists and RTL layouts. Preflow is vertical-only.

**When Preflow is the right choice:** You can predict heights (fixed-height items, text with known font metrics, data-driven layouts), you need SSR/worker support, or you want minimal bundle size.

**When TanStack/Virtuoso is the better choice:** Content heights are unknown until rendered, you need DOM measurement, horizontal scrolling, sticky headers, or table virtualization.

## Feature Comparison

|  | Preflow | TanStack Virtual | react-virtuoso |
|---|---|---|---|
| **Architecture** | | | |
| Height source | Predictive (arithmetic) | DOM measurement | DOM measurement |
| DOM-free core | Yes | No | No |
| SSR / Node.js | Full | Partial | Partial |
| Framework-agnostic core | Yes | Yes | No |
| Bundle size (core, gzip) | 2.2 KB | 5.4 KB | 17 KB |
| **Layout Modes** | | | |
| 1D list | Yes | Yes | Yes |
| Grid | Yes | Partial (lanes) | Yes |
| Masonry | Yes | No | No |
| Chat (bottom-anchored) | Yes | No | Yes |
| Horizontal list | No | Yes | No |
| Line-level prose | Yes | No | No |
| **Measurement** | | | |
| Pre-calculated heights | Yes | Yes (`estimateSize`) | Yes (`defaultItemHeight`) |
| DOM element measurement | No | Yes (`measureElement`) | Yes (automatic) |
| Dynamic height adjustment | No | Yes | Yes |
| **Scrolling** | | | |
| Container scroll | Yes | Yes | Yes |
| Window scroll | Yes | Yes | Yes |
| Scroll correction (prepend) | Built-in | Manual | Built-in |
| Auto-follow (chat) | Built-in | No | Built-in |
| Bidirectional infinite scroll | Built-in | Manual | Built-in |
| Smooth scroll behavior | No | Yes | Yes |
| RTL support | No | Yes | No |
| isScrolling state | No | Yes | Yes |
| **Features** | | | |
| Sticky headers / groups | No | Manual | Yes |
| Table virtualization | No | No | Yes |
| **Dynamic Data** | | | |
| Append items | O(k) incremental | O(n) rebuild | O(n) rebuild |
| Prepend with correction | Built-in | Manual | Built-in |
| Container resize reflow | `setContainerWidth` | `measureElement` | Automatic |
| **Data Structures** | | | |
| Offset lookup | O(1) prefix-sum | O(1) array index | O(log n) tree |
| Scroll-to-index | O(log n) | O(log n) | O(log n) |
| Internal storage | `Float64Array` | JS objects | JS objects |
| **Framework Support** | | | |
| React | `@preflow/react` | `@tanstack/react-virtual` | Built-in |
| Vue | `@preflow/vue` | `@tanstack/vue-virtual` | No |
| Svelte | Planned | `@tanstack/svelte-virtual` | No |
| Solid | Planned | `@tanstack/solid-virtual` | No |
| **API** | | | |
| Style | Functional (`createFlow`) | Class (`new Virtualizer`) | Component |
| Unified return type | Yes (all modes -> `Flow`) | No | No |
| TypeScript | Full | Full | Full |

## Packages

| Package | Description | Min | Gzip |
|---|---|---|---|
| `@preflow/core` | Headless virtualization engine (zero deps) | 5.6 KB | 2.2 KB |
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
