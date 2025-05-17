import { UnifiedCache } from "../src";

describe("LFU test", () => {
    it("simple set,get", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LFU");
        await cache.set("key1", "data1");
        const data = await cache.get("key1");
        expect(data).toEqual("data1");
    });
    it("delete the lfu item cache item limit", async () => {
        const cache = new UnifiedCache<string, string>(3, 1024 * 1024, "LFU");
        await cache.set("key1", "data1");
        await cache.set("key2", "data2");
        await cache.set("key3", "data3"); // key3(1),key2(1),key1(1) 
        await cache.get("key2");
        await cache.get("key1");
        const data2 = await cache.get("key2"); // key3(1),key2(3),key1(2) : increment
        expect(data2).toEqual("data2");
        await cache.set("key4", "data4"); //size limit key4(1),key2(3),key1(2) : remove key3
        const data3 = await cache.get("key3");
        expect(data3).toEqual(undefined);
        await cache.set("key5", "data5"); //size limit key5(1),key2(3),key1(2) : remove key4
        const data4 = await cache.get("key4");
        expect(data4).toEqual(undefined);
        const date5 = await cache.get("key5");
        expect(date5).toEqual("data5");
        const data22 = await cache.get("key2");
        expect(data22).toEqual("data2");
        const data1 = await cache.get("key1");
        expect(data1).toEqual("data1");
    });
});
