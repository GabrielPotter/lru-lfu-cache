
# UnifiedCache

A TypeScript implementation of a unified in-memory cache supporting both **LRU (Least Recently Used)** and **LFU (Least Frequently Used)** eviction strategies. This cache manages capacity by **node count** and **memory usage (approximate object size)** with thread-safe operations using a mutex.

## Features

* Supports both **LRU** and **LFU** strategies.
* Thread-safe with **async-mutex**.
* Limits by **maximum number of nodes** and **maximum memory usage**.
* Efficient **O(1)** access, update, and eviction.
* Exposes statistics and a **human-readable JSON dump**.
* Can dynamically **clear and reconfigure** cache parameters.

## Installation

```bash
npm install async-mutex
```

No additional dependencies are required beyond `async-mutex`.

## Usage

```typescript
import { UnifiedCache } from "./UnifiedCache";

const cache = new UnifiedCache<string, any>(5, 1024 * 1024, "LRU"); // 5 nodes, 1MB max, LRU strategy

await cache.set("key1", { data: "value1" });
await cache.set("key2", { data: "value2" });

console.log(await cache.get("key1")); // { data: 'value1' }

console.log(cache.getStats()); // { strategy: 'LRU', currentNodes: 2, ... }

console.log(cache.dump()); // Pretty JSON of current cache state

await cache.clear({ capacity: 10, strategy: "LFU" }); // Reset cache with new config
```

## API Reference

### Constructor

```ts
new UnifiedCache<K, V>(capacity: number, maxMemory: number, strategy?: "LRU" | "LFU")
```

* `capacity`: Max number of nodes.
* `maxMemory`: Approximate maximum memory usage in bytes.
* `strategy`: Caching strategy, either `"LRU"` (default) or `"LFU"`.

### Methods

#### `async get(key: K): Promise<V | undefined>`

Retrieves a value by key. Updates usage stats (LRU position or LFU frequency).

#### `async set(key: K, value: V): Promise<void>`

Sets a value for the key. Updates existing node or adds a new one. Evicts nodes if capacity or memory limits exceeded.

#### `async clear(params?: { capacity?: number; maxMemory?: number; strategy?: "LRU" | "LFU" }): Promise<void>`

Clears the cache and optionally updates configuration.

#### `getStats(): { strategy: CacheStrategy; currentNodes: number; maxNodes: number; currentMemory: number; maxMemory: number }`

Returns current cache statistics.

#### `dump(): string`

Returns a human-readable JSON of the cache map, including keys, values, frequencies, sizes, and neighbor node references (`prev`, `next`).

## Internal Details

* **Doubly Linked List**: For fast LRU operations.
* **Frequency Map**: For LFU frequency counting.
* **Mutex Locking**: Ensures concurrent access safety.
* **Approximate Object Size Calculation**: Estimates size in bytes (primitive types & traversing objects).

### Example Dump Output

```json
{
  "key1": {
    "key": "key1",
    "value": { "data": "value1" },
    "freq": 1,
    "size": 32,
    "prev": null,
    "next": "key2"
  },
  "key2": {
    "key": "key2",
    "value": { "data": "value2" },
    "freq": 1,
    "size": 32,
    "prev": "key1",
    "next": null
  }
}
```

## Notes

* The size calculation (`roughSizeOfObject`) is a **best-effort estimation**. It's not precise like `process.memoryUsage()`.
* Large arrays are summarized in dumps with a `[ ... N items ]` placeholder.
* For heavy concurrent workloads, the mutex ensures data consistency at the cost of performance (single-threaded access).

## License

MIT



