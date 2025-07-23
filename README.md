
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
npm install @gabrielpotter/lru-lfu-cache
```

## Dependencies

`async-mutex`.

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
new UnifiedCache<K, V>(capacity: number, maxMemory: number, strategy?: "LRU" | "LFU", hitReset?:1000)
```

* `capacity`: Max number of nodes.
* `maxMemory`: Approximate maximum memory usage in bytes.
* `strategy`: Caching strategy, either `"LRU"` (default) or `"LFU"`.
* `hitReset`: Reset the relative hitrate after hitReset request (get)

### Methods

#### `async get(key: K): Promise<V | undefined>`

Retrieves a value by key. Updates usage stats (LRU position or LFU frequency).

#### `async getValueAndMeta(key: K): Promise<{ value: V; meta: { [key: string]: any } | undefined } | undefined>`

Retrives the value and metadata by key. Updates usage stats (LRU position and LFU trequency)

#### `async getByMeta(callback: (meta: { [key: string]: any }) => boolean): Promise<V[]>`

Retrives all values for which the callback function evaluates to true on the metadata associated with each key. Updates usage stats (LRU position and LFU trequency)

#### `async getMeta(key: K): Promise<{ [key: string]: any } | undefined> `

Retrives the metadata by key. Updates usage stats (LRU position and LFU trequency)

#### `async test(key: K): Promise<boolean> `

Test if the key exists in the cache. Does not update usage stats.

#### `async set(key: K, value: V): Promise<void>`

Sets a value for the key. Updates existing node or adds a new one. Evicts nodes if capacity or memory limits exceeded. Does not update usage stats.

#### `async remove(key: K): Promise<void>`
Remove the key and its associated value and metadata from the cache. Does not update usage stats.

#### `async removeByMeta(callback: (meta: { [key: string]: any }) => boolean): Promise<void>`
Remove all keys associated values and metadata from cache for which the callback function evaluates to true on the metadata associated with each key. Does not update usage stats.

#### `async clear(params?: { capacity?: number; maxMemory?: number; strategy?: "LRU" | "LFU" }): Promise<void>`

Clears the cache and optionally updates configuration.

#### `getStats(): { strategy: CacheStrategy; currentNodes: number; maxNodes: number; currentMemory: number; maxMemory: number; relHitRate: number; absHitRate: number}`

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
    "next": "key2",
    "meta": {}
  },
  "key2": {
    "key": "key2",
    "value": { "data": "value2" },
    "freq": 1,
    "size": 32,
    "prev": "key1",
    "next": null,
    "meta":{"mk1":"mval1","mk2":"mval2"}
  }
}
```

## Notes

* The size calculation (`roughSizeOfObject`) is a **best-effort estimation**. It's not precise like `process.memoryUsage()`.
* Large arrays are summarized in dumps with a `[ ... N items ]` placeholder.
* For heavy concurrent workloads, the mutex ensures data consistency at the cost of performance (single-threaded access).

## License

MIT



