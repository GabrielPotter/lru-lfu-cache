import { UnifiedCache } from "../src";

describe("Meta data test", () => {
    it("set additional metadata", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LRU");
        await cache.set("key1", "data1", { meta1: "mv1", meta2: "mv2" });
        await cache.set("key2", "data2");
        const data = await cache.get("key1");
        expect(data).toEqual("data1");
        const meta = await cache.getMeta("key1");
        expect(meta?.meta1).toEqual("mv1");
        const meta2 = await cache.getMeta("key2");
        expect(meta2).toEqual({});
        const meta3 = await cache.getMeta("key3");
        expect(meta3).toEqual(undefined);
        const data4 = await cache.getValueAndMeta("key1");
        expect(data4).toEqual({ value: "data1", meta: { meta1: "mv1", meta2: "mv2" } });
    });

    it("remove based on metadata", async () => {
        const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LRU");
        await cache.set("key1", "data1", { meta1: "mv1", meta2: "mv2" });
        await cache.set("key2", "data2", { meta1: "mv1", meta2: "mv2a", meta3: "mv3" });
        await cache.set("key3", "data3", { meta1: "mv1a", meta2: "mv2a", meta3: "mv3a" });
        const data11 = await cache.get("key1");
        expect(data11).toEqual("data1");
        const fn = (meta: { [key: string]: any }) => {
            if (meta.meta1 === "mv1a") {
                return true;
            } else {
                return false;
            }
        };
        await cache.removeByMeta(fn);
        const data = await cache.get("key3");
        expect(data).toEqual(undefined);
        const data1 = await cache.get("key1");
        expect(data1).toEqual("data1");
        await cache.set("key3", "data3", { meta1: "mv1a", meta2: "mv2a", meta3: "mv3a" });
        const fn2 = (meta: { [key:string]:any}) =>{
            if (meta.meta2 === "mv2a"){
                return true;
            }else{
                return false;
            }
        }
        await cache.removeByMeta(fn2);
        const d1 = await cache.get("key1");
        const d2 = await cache.get("key2");
        const d3 = await cache.get("key3")
        expect(d1).toEqual("data1");
        expect(d2).toEqual(undefined);
        expect(d3).toEqual(undefined);
    });

    it("get based on meta", async () => {
         const cache = new UnifiedCache<string, string>(100, 1024 * 1024, "LRU");
        await cache.set("key1", "data1", { meta1: "mv1", meta2: "mv2" });
        await cache.set("key2", "data2", { meta1: "mv1", meta2: "mv2a", meta3: "mv3" });
        await cache.set("key3", "data3", { meta1: "mv1a", meta2: "mv2a", meta3: "mv3a" });
        const data11 = await cache.get("key1");
        expect(data11).toEqual("data1");
         const fn2 = (meta: { [key:string]:any}) =>{
            if (meta.meta2 === "mv2a"){
                return true;
            }else{
                return false;
            }
        }
        const res = await cache.getByMeta(fn2);
        expect(res).toEqual(expect.arrayContaining(["data3","data2"]));
    })
});
