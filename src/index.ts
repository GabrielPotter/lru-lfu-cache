import { Mutex } from "async-mutex";

type CacheStrategy = "LRU" | "LFU";

class CacheNode<K, V> {
    key: K;
    value: V;
    freq: number;
    size: number;
    prev: CacheNode<K, V> | null = null;
    next: CacheNode<K, V> | null = null;

    constructor(key: K, value: V, size: number) {
        this.key = key;
        this.value = value;
        this.freq = 1;
        this.size = size;
    }
}

class DoublyLinkedList<K, V> {
    head: CacheNode<K, V> | null = null;
    tail: CacheNode<K, V> | null = null;

    addToFront(node: CacheNode<K, V>): void {
        node.next = this.head;
        node.prev = null;
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
    }

    removeNode(node: CacheNode<K, V>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
        node.prev = null;
        node.next = null;
    }

    moveToFront(node: CacheNode<K, V>): void {
        this.removeNode(node);
        this.addToFront(node);
    }

    removeTail(): CacheNode<K, V> | null {
        if (!this.tail) return null;
        const tailNode = this.tail;
        this.removeNode(tailNode);
        return tailNode;
    }
}

export class UnifiedCache<K, V> {
    private capacity: number;
    private maxMemory: number;
    private strategy: CacheStrategy;
    private cacheMap: Map<K, CacheNode<K, V>>;
    private lruList: DoublyLinkedList<K, V>;
    private freqMap: Map<number, Set<CacheNode<K, V>>>;
    private minFreq: number;
    private mutex: Mutex;
    private currentMemory: number;
    private absHit: number;
    private absReq: number;
    private relHit: number;
    private relReq: number;
    private hitResetCounter: number;

    constructor(capacity: number, maxMemory: number, strategy: CacheStrategy = "LRU", hitReset: number = 1000) {
        this.capacity = capacity;
        this.maxMemory = maxMemory;
        this.strategy = strategy;
        this.cacheMap = new Map();
        this.lruList = new DoublyLinkedList();
        this.freqMap = new Map();
        this.minFreq = 0;
        this.mutex = new Mutex();
        this.currentMemory = 0;
        this.absHit = 0;
        this.absReq = 0;
        this.relHit = 0;
        this.relReq = 0;
        this.hitResetCounter = hitReset;
    }
    async clear(params?: {
        capacity?: number;
        maxMemory?: number;
        strategy?: CacheStrategy;
        hitReset?: number;
    }): Promise<void> {
        return this.mutex.runExclusive(() => {
            if (params?.capacity) {
                this.capacity = params.capacity;
            }
            if (params?.maxMemory) {
                this.maxMemory = params.maxMemory;
            }
            if (params?.strategy) {
                this.strategy = params.strategy;
            }
            if (params?.hitReset) {
                this.hitResetCounter = params.hitReset;
            }
            this.cacheMap = new Map();
            this.lruList = new DoublyLinkedList();
            this.freqMap = new Map();
            this.minFreq = 0;
            this.mutex = new Mutex();
            this.currentMemory = 0;
            this.absHit = 0;
            this.absReq = 0;
            this.relHit = 0;
            this.relReq = 0;
        });
    }

    async get(key: K): Promise<V | undefined> {
        return this.mutex.runExclusive(() => {
            this.absReq++;
            this.relReq++;
            if(this.relReq > this.hitResetCounter){
                this.relReq = 1;
                this.relHit = 0;
            }
            const node = this.cacheMap.get(key);
            if (!node) return undefined;
            this.absHit++;
            this.relHit++;
            if (this.strategy === "LRU") {
                this.lruList.moveToFront(node);
            } else {
                this.updateFrequency(node);
            }
            return node.value;
        });
    }

    async set(key: K, value: V): Promise<void> {
        return this.mutex.runExclusive(() => {
            const existingNode = this.cacheMap.get(key);
            const size = this.roughSizeOfObject(value);

            if (existingNode) {
                this.currentMemory -= existingNode.size;
                existingNode.value = value;
                existingNode.size = size;
                this.currentMemory += size;

                if (this.strategy === "LRU") {
                    this.lruList.moveToFront(existingNode);
                } else {
                    this.updateFrequency(existingNode);
                }
            } else {
                while (this.cacheMap.size >= this.capacity || this.currentMemory + size > this.maxMemory) {
                    this.evict();
                }

                const newNode = new CacheNode(key, value, size);
                this.cacheMap.set(key, newNode);
                this.currentMemory += size;

                if (this.strategy === "LRU") {
                    this.lruList.addToFront(newNode);
                } else {
                    this.minFreq = 1;
                    this.addToFreqMap(newNode);
                }
            }
        });
    }

    private evict(): void {
        let node: CacheNode<K, V> | undefined | null = null;

        if (this.strategy === "LRU") {
            node = this.lruList.removeTail();
        } else {
            const nodes = this.freqMap.get(this.minFreq);
            if (nodes) {
                node = nodes.values().next().value;
                if (node) {
                    nodes.delete(node);
                }
                if (nodes.size === 0) {
                    this.freqMap.delete(this.minFreq);
                }
            }
        }

        if (node) {
            this.cacheMap.delete(node.key);
            this.currentMemory -= node.size;
        }
    }

    private updateFrequency(node: CacheNode<K, V>): void {
        const freq = node.freq;
        const nodes = this.freqMap.get(freq);
        if (nodes) {
            nodes.delete(node);
            if (nodes.size === 0) {
                this.freqMap.delete(freq);
                if (this.minFreq === freq) {
                    this.minFreq++;
                }
            }
        }
        node.freq++;
        this.addToFreqMap(node);
    }

    private addToFreqMap(node: CacheNode<K, V>): void {
        const freq = node.freq;
        if (!this.freqMap.has(freq)) {
            this.freqMap.set(freq, new Set());
        }
        this.freqMap.get(freq)!.add(node);
    }

    private roughSizeOfObject(object: any): number {
        const objectList: any[] = [];
        const stack: any[] = [object];
        let bytes = 0;

        while (stack.length) {
            const value = stack.pop();

            if (typeof value === "boolean") {
                bytes += 4;
            } else if (typeof value === "string") {
                bytes += value.length * 2;
            } else if (typeof value === "number") {
                bytes += 8;
            } else if (typeof value === "object" && value !== null) {
                if (objectList.indexOf(value) === -1) {
                    objectList.push(value);
                    for (const i in value) {
                        stack.push(value[i]);
                    }
                }
            }
        }
        return bytes;
    }

    getStats() {
        return {
            strategy: this.strategy,
            currentNodes: this.cacheMap.size,
            maxNodes: this.capacity,
            currentMemory: this.currentMemory,
            maxMemory: this.maxMemory,
            absHitRate: (() => {
                if (this.absHit == 0) {
                    return 0;
                } else {
                    return Number((this.absHit / this.absReq).toFixed(2));
                }
            })(),
            relHitRate: (() => {
                if (this.relHit == 0) {
                    return 0;
                } else {
                    return Number((this.relHit / this.relReq).toFixed(2));
                }
            })(),
        };
    }
    private sizeSuppressorReplacer(key: string, value: any) {
        if (Array.isArray(value) && value.length > 100) {
            return `[ ... ${value.length} items ]`;
        }
        return value;
    }
    dump() {
        const plainObj = Object.fromEntries(
            [...this.cacheMap.entries()].map(([key, node]) => [
                key as any,
                {
                    key: node.key,
                    value: node.value,
                    freq: node.freq,
                    size: node.size,
                    prev: node.prev ? node.prev.key : null,
                    next: node.next ? node.next.key : null,
                },
            ])
        );

        return JSON.stringify(plainObj, this.sizeSuppressorReplacer, 2);
    }
}
