import { UnifiedCache } from "../src";

describe("LRU test", () => {
    it("simple set,get", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LRU");
        await cache.set("key1", "data1");
        const data = await cache.get("key1");
        expect(data).toEqual("data1");
    });
    it("delete the lru item cache item limit", async () => {
        const cache = new UnifiedCache<string, string>(3, 1024 * 1024, "LRU");
        await cache.set("key1", "data1");
        await cache.set("key2", "data2");
        await cache.set("key3", "data3"); // key3 -> key2 -> key1 : insert to head
        const data2 = await cache.get("key2"); // key2 -> key3 -> key1 : move to head
        expect(data2).toEqual("data2");
        await cache.set("key4", "data4"); //size limit key4 -> key2 -> key3 : insert head remove tail
        const data1 = await cache.get("key1");
        expect(data1).toEqual(undefined);
        await cache.set("key5", "data5"); //size limit key5 -> key4 -> key2 : insert head remove tail
        const data3 = await cache.get("key3");
        expect(data3).toEqual(undefined);
        await cache.get("key2");
        await cache.get("key5"); // key5 -> key2 -> key4
        await cache.set("key6", "data6"); // key6 -> key5 -> key2
        const data4 = await cache.get("key4");
        expect(data4).toEqual(undefined);
    });

    it("delete the lru item cache memory limit", async () => {
        const cache = new UnifiedCache<string, string>(10, 100, "LRU");
        await cache.set("key1", "data112345678");
        await cache.set("key2", "data212345678");
        await cache.set("key3", "data312345678"); // key3 -> key2 -> key1 : insert to head
        const data2 = await cache.get("key2"); // key2 -> key3 -> key1 : move to head
        await cache.set("key4", "data412345678"); //size limit key4 -> key2 -> key3 : insert head remove tail
        const data1 = await cache.get("key1");
        await cache.set("key5", "data512345678"); //size limit key5 -> key4 -> key2 : insert head remove tail
        const data3 = await cache.get("key3");
        await cache.get("key2");
        await cache.get("key5"); // key5 -> key2 -> key4
        await cache.set("key6", "data612345678"); // key6 -> key5 -> key2
        const data4 = await cache.get("key4");
        expect(data2).toEqual("data212345678");
        expect(data1).toEqual(undefined);
        expect(data3).toEqual(undefined);
        expect(data4).toEqual(undefined);
        const stat = cache.getStats();
        expect(stat).toEqual({ strategy: "LRU", currentNodes: 3, maxNodes: 10, currentMemory: 78, maxMemory: 100,absHitRate:0.5,relHitRate:0.5 });
    });

    it("delete the lru item cache item limit", async () => {
        const cache = new UnifiedCache<string, string>(3, 1024 * 1024, "LRU");
        await cache.set("key1", "data1");
        await cache.set("key2", "data2");
        await cache.set("key3", "data3"); // key3 -> key2 -> key1 : insert to head
        const data2 = await cache.get("key2"); // key2 -> key3 -> key1 : move to head
        expect(data2).toEqual("data2");
        await cache.set("key4", "data4"); //size limit key4 -> key2 -> key3 : insert head remove tail
        const data1 = await cache.get("key1");
        expect(data1).toEqual(undefined);
        await cache.set("key5", "data5"); //size limit key5 -> key4 -> key2 : insert head remove tail
        const data3 = await cache.get("key3");
        expect(data3).toEqual(undefined);
        await cache.get("key2");
        await cache.get("key5"); // key5 -> key2 -> key4
        await cache.set("key6", "data6"); // key6 -> key5 -> key2
        const data4 = await cache.get("key4");
        expect(data4).toEqual(undefined);
    });
});
