import { UnifiedCache } from "../src";

function genBuffer(pattern: string, size: number): Buffer {
    const patternBuffer = Buffer.from(pattern, "hex");
    const repeat = Math.ceil(size / patternBuffer.length);
    const finalBuffer = Buffer.alloc(repeat * patternBuffer.length);
    for (let i = 0; i < repeat; i++) {
        patternBuffer.copy(finalBuffer, i * patternBuffer.length);
    }
    return finalBuffer;
}

describe("Binary buffer test", () => {
    it("lru add binary buffers", async () => {
        const cache = new UnifiedCache<string, Buffer>(100, 1024 * 1024, "LRU");
        const keys = [] as string[];
        for (let i = 0; i < 10; i++) {
            await cache.set(`buffer${i}`, genBuffer("f0f5", i * 200 + 100));
            keys.push(`buffer${i}`);
        }
        const dump = await cache.dump();
        expect(keys.every((sub) => dump.includes(sub))).toBe(true);
    });
    it("lfu add binary buffers", async () => {
        const cache = new UnifiedCache<string, Buffer>(100, 1024 * 1024, "LFU");
        for (let i = 0; i < 10; i++) {
            await cache.set(`buffer${i}`, genBuffer("f0f5", i * 200 + 100));
        }
        expect(cache.getStats().currentNodes).toEqual(10)

        await cache.clear();
        expect(cache.getStats()).toEqual({
            strategy: "LFU",
            currentNodes: 0,
            maxNodes: 100,
            currentMemory: 0,
            maxMemory: 1048576,
        });
    });
    it("update cache items", async () => {
        const cache = new UnifiedCache<string, Buffer>(100, 1024 * 1024, "LRU");
        for (let i = 0; i < 10; i++) {
            await cache.set("buffer", genBuffer("f5f5", i * 200 + 100));
        }
        expect(cache.getStats().currentNodes).toEqual(1)
        await cache.clear({capacity: 10});
        for (let i = 0; i < 15; i++) {
            await cache.set(`buffer${i}`, genBuffer("f5f5", i * 200 + 100));
        }
        expect(cache.getStats().currentNodes).toEqual(10)
        await cache.clear({capacity: 10,maxMemory:140000});
         for (let i = 0; i < 15; i++) {
            await cache.set(`buffer${i}`, genBuffer("f5f5", i * 200 + 100));
        }
        expect(cache.getStats().currentNodes).toEqual(7)
    });
});
