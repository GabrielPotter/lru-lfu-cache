import { UnifiedCache } from "../src";

describe("hit rate test", () => {
    it("100%", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LFU");
        expect(cache.getStats().absHitRate).toEqual(0)
        await cache.set("key1", "data1");
        for (let i = 0; i < 100; i++) {
            await cache.get("key1");
        }
        expect(cache.getStats().absHitRate).toEqual(1.0);
        expect(cache.getStats().relHitRate).toEqual(1.0);
    });
    it("50%", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LFU");
        await cache.set("key1", "data1");
        for (let i = 0; i < 50; i++) {
            await cache.get("key1");
        }
        for (let i = 0; i < 50; i++) {
            await cache.get("key2");
        }
        expect(cache.getStats().absHitRate).toEqual(0.5);
        expect(cache.getStats().relHitRate).toEqual(0.5);
    });
    it("50%", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LFU", 10);
        await cache.set("key1", "data1");
        for (let i = 0; i < 50; i++) {
            await cache.get("key1");
        }
        for (let i = 0; i < 50; i++) {
            await cache.get("key2");
        }
        for (let i = 0; i < 1; i++) {
            await cache.get("key1");
        }
        for (let i = 0; i < 3; i++) {
            await cache.get("key2");
        }
        expect(cache.getStats().absHitRate).toEqual(0.49); // accumulated hits (51 hit 53 fail )
        expect(cache.getStats().relHitRate).toEqual(0.25); // 5 reset,  then 1 hit 3 fail
        cache.clear(); // clear reset both abs and rel hit counters
        await cache.set("key1", "data1");
        for (let i = 0; i < 5; i++) {
            await cache.get("key1");
        }
        for (let i = 0; i < 5; i++) {
            await cache.get("key2");
        }
        expect(cache.getStats().absHitRate).toEqual(0.5);
        expect(cache.getStats().relHitRate).toEqual(0.5);
    });
});
