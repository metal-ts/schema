import { describe, expect, it } from "vitest"
import { t } from "../index"
import { label } from "./utils/test.label"

describe(label.unit("MetalType - UnionSchema"), () => {
    it(label.case("should parse union of string and number -> strict"), () => {
        const unionSchema = t.union(t.string, t.number)
        const parsed = unionSchema.parse("hello")
        const parsed2 = unionSchema.parse(1)

        expect(parsed).toEqual("hello")
        expect(parsed2).toEqual(1)
    })

    it(label.case("should parse union of string and number -> strict"), () => {
        const unionSchema = t.union(t.string, t.number)
        const parsed = unionSchema.parse("hello")
        const parsed2 = unionSchema.parse(1)

        expect(parsed).toEqual("hello")
        expect(parsed2).toEqual(1)
    })

    it(label.case("should parse union of object and array -> strict"), () => {
        const unionSchema = t.union(
            t
                .object({
                    hello: t.string,
                })
                .filter(),
            t.array(t.number)
        )
        const parsed = unionSchema.parse({
            hello: "hello",
            shouldBeFiltered: true,
        })
        const parsed2 = unionSchema.parse({
            hello: "hello",
            world: 1,
        })
        const parsed3 = unionSchema.parse([1, 2, 3])

        expect(parsed).toEqual({ hello: "hello" })
        expect(parsed2).toEqual({ hello: "hello" })
        expect(parsed3).toEqual([1, 2, 3])
    })

    it(label.case("should parse union of literal -> strict"), () => {
        const unionSchema = t.union(t.literal("hello"), t.literal(1))
        const parsed = unionSchema.parse("hello")
        const parsed2 = unionSchema.parse(1)

        expect(parsed).toEqual("hello")
        expect(parsed2).toEqual(1)
    })

    it(label.case("should parse union of tuple -> strict"), () => {
        const unionSchema = t.union(
            t.tuple([t.string, t.number]),
            t.tuple([t.number, t.string])
        )
        const parsed = unionSchema.parse(["hello", 1])
        const parsed2 = unionSchema.parse([1, "hello"])

        expect(parsed).toEqual(["hello", 1])
        expect(parsed2).toEqual([1, "hello"])
    })

    it(label.case("should parse union of unknown -> strict"), () => {
        const unionSchema = t.union(t.unknown, t.unknown)
        const parsed = unionSchema.parse("hello")
        const parsed2 = unionSchema.parse(1)
        const parsed3 = unionSchema.parse(true)

        expect(parsed).toEqual("hello")
        expect(parsed2).toEqual(1)
        expect(parsed3).toEqual(true)
    })

    it(label.case("should parse union of union -> strict"), () => {
        const unionSchema = t.union(
            t.union(t.symbol, t.number),
            t.union(t.boolean, t.literal("hello"))
        )
        const parsed = unionSchema.parse("hello")
        const parsed2 = unionSchema.parse(1)
        const parsed3 = unionSchema.parse(true)

        expect(parsed).toEqual("hello")
        expect(parsed2).toEqual(1)
        expect(parsed3).toEqual(true)
    })
})
