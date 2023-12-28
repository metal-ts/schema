import { describe, expect, it } from "vitest"
import { t } from "../index"
import { label } from "./utils/test.label"

describe(label.unit("MetalType - ArraySchema"), () => {
    it(label.case("should parse array of number -> strict"), () => {
        const arraySchema = t.array(t.number)
        const parsed = arraySchema.parse([1, 2, 3])
        expect(parsed).toEqual([1, 2, 3])
    })

    it(label.case("should parse array of object -> strict"), () => {
        const arraySchema = t.array(
            t
                .object({
                    hello: t.string,
                    world: t.number,
                })
                .filter()
        )
        const parsed = arraySchema.parse([
            { hello: "hello", world: 1 },
            { hello: "world", world: 20, thisShouldBeThrown: true },
        ])
        expect(parsed).toEqual([
            { hello: "hello", world: 1 },
            { hello: "world", world: 20, thisShouldBeThrown: true },
        ])
    })

    it(label.case("should parse array of array -> strict"), () => {
        const arraySchema = t.array(t.array(t.number))
        const parsed = arraySchema.parse([
            [1, 2, 3],
            [4, 5, 6],
        ])
        expect(parsed).toEqual([
            [1, 2, 3],
            [4, 5, 6],
        ])
    })

    it(label.case("should parse array of tuple -> strict"), () => {
        const arraySchema = t.array(t.tuple([t.string, t.number, t.boolean]))
        const parsed = arraySchema.parse([
            ["hello", 1, true],
            ["world", 2, false],
        ])
        expect(parsed).toEqual([
            ["hello", 1, true],
            ["world", 2, false],
        ])
    })

    it(label.case("should parse array of literal -> strict"), () => {
        const arraySchema = t.array(t.literal("hello"))
        const parsed = arraySchema.parse(["hello", "hello", "hello"])
        expect(parsed).toEqual(["hello", "hello", "hello"])
    })

    it(label.case("should parse array of unknown -> strict"), () => {
        const arraySchema = t.array(t.unknown)
        const parsed = arraySchema.parse(["hello", 1, true])
        expect(parsed).toEqual(["hello", 1, true])
    })

    it(label.case("should parse array of any -> strict"), () => {
        const arraySchema = t.array(t.any)
        const parsed = arraySchema.parse(["hello", 1, true])
        expect(parsed).toEqual(["hello", 1, true])
    })

    it(label.case("should parse array of array of array -> strict"), () => {
        const arraySchema = t.array(t.array(t.array(t.number)))
        const parsed = arraySchema.parse([
            [
                [1, 2, 3],
                [4, 5, 6],
            ],
            [
                [7, 8, 9],
                [10, 11, 12],
            ],
        ])
        expect(parsed).toEqual([
            [
                [1, 2, 3],
                [4, 5, 6],
            ],
            [
                [7, 8, 9],
                [10, 11, 12],
            ],
        ])
    })

    it(
        label.case("should parse array of array of complex object -> strict"),
        () => {
            const complexArraySchema = t.array(
                t.array(
                    t.union(
                        t
                            .object({
                                hello: t.string,
                                world: t.number,
                            })
                            .filter(),
                        t.array(t.literal("hello")),
                        t.union(t.number, t.object({ hello: t.string }))
                    )
                )
            )

            const parsed = complexArraySchema.parse([
                [
                    { hello: "hello", world: 1 },
                    { hello: "world", world: 2, thisShouldBeThrown: true },
                ],
                [["hello", "hello", "hello"]],
                [1, 2, 3],
            ])

            expect(parsed).toEqual([
                [
                    { hello: "hello", world: 1 },
                    { hello: "world", world: 2, thisShouldBeThrown: true },
                ],
                [["hello", "hello", "hello"]],
                [1, 2, 3],
            ])

            const numberParsed = complexArraySchema.parse([[1, 2, 3]])
            expect(numberParsed).toEqual([[1, 2, 3]])

            const literalParsed = complexArraySchema.parse([
                [["hello", "hello", "hello"]],
            ])
            expect(literalParsed).toEqual([[["hello", "hello", "hello"]]])
        }
    )

    it(label.case("should parse optional | nullable | nullish array"), () => {
        const arraySchema = t.array(t.number).nullable()
        const parsed = arraySchema.parse(null)
        expect(parsed).toEqual(null)

        const arraySchema2 = t.array(t.number).optional()
        const parsed2 = arraySchema2.parse(undefined)
        expect(parsed2).toEqual(undefined)

        const arraySchema3 = t.array(t.number).nullish()
        const parsed3 = arraySchema3.parse(undefined)
        expect(parsed3).toEqual(undefined)
    })
})
