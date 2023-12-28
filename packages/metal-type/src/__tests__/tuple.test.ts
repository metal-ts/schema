import { describe, expect, it } from "vitest"
import { Schema } from "../schema"
import { t } from "../schema/t"
import { TupleSchema } from "../schema/tuple"
import { label } from "./utils/test.label"

describe(label.unit("MetalType - TupleSchema"), () => {
    it(label.case("should create a tuple schema"), () => {
        const schema = t.tuple([t.string, t.number])

        expect(schema).toBeInstanceOf(TupleSchema)
        expect(schema.name).toBe("TUPLE")
        expect(schema.shape).toEqual([t.string, t.number])
    })

    it(label.case("should create an optional tuple schema"), () => {
        const schema = t.tuple([t.string, t.number]).nullish()

        expect(schema).toBeInstanceOf(TupleSchema)
        expect(schema.name).toBe("TUPLE")
        expect(schema.shape).toEqual([t.string, t.number])
    })

    it(label.case("should parse tuple -> strict"), () => {
        const ExtremeTuple = t.tuple([
            t.string,
            t.number,
            t.boolean,
            t.symbol,
            t.undefined,
            t.null,
            t.any,
            t.unknown,
            t.literal("hello"),
            t.literal(1),
            t.literal(true),
            t
                .object({
                    hello: t.string,
                    world: t.number,
                    deeply: t.object({
                        nested: t.string,
                        a: t.object({
                            b: t.string,
                            c: t.boolean,
                        }),
                    }),
                })
                .partial()
                .filter()
                .nullish(),
        ])

        const sameSymbol = Symbol("hello")
        const parsed = ExtremeTuple.parse([
            "hello",
            1,
            true,
            sameSymbol,
            undefined,
            null,
            "hello",
            "hello",
            "hello",
            1,
            true,
            {
                hello: "hello",
                world: 1,
                notFiltered: "filtered",
            },
        ])
        expect(parsed).toStrictEqual([
            "hello",
            1,
            true,
            sameSymbol,
            undefined,
            null,
            "hello",
            "hello",
            "hello",
            1,
            true,
            {
                hello: "hello",
                world: 1,
                notFiltered: "filtered",
            },
        ])
    })

    it(label.case("should deep clone tupleShape -> zero side effect"), () => {
        const schema = t.tuple([t.string, t.number])
        const sameShape = schema.shape

        // @ts-expect-error readonly property, can't be modified by typescript
        // it can be modified by javascript, but it's not recommended
        sameShape[0] = t.boolean
        expect(sameShape[0]).toEqual(t.boolean)
        expect(schema.shape[0]).toEqual(t.string)
        const parsed = schema.parse(["not boolean", 1])
        expect(parsed).toEqual(["not boolean", 1])
    })

    it(label.case("should create a nullable tuple schema"), () => {
        const schema = t.tuple([t.string, t.number]).nullable()

        expect(schema).toBeInstanceOf(Schema)
        expect(schema.name).toBe("TUPLE")
        expect(schema.shape).toEqual([t.string, t.number])
    })

    it(label.case("should create a nullish tuple schema"), () => {
        const schema = t.tuple([t.string, t.number]).optional()

        expect(schema).toBeInstanceOf(Schema)
        expect(schema.name).toBe("TUPLE")
        expect(schema.shape).toEqual([t.string, t.number])
    })
})
