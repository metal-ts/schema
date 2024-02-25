import { type TypeEqual, expectType } from "ts-expect"
import { describe, it } from "vitest"
import { type Infer, t } from "../index"
import { label } from "./utils/test.label"

describe(label.unit("MetalType - Infer"), () => {
    it(
        label.case("should infer object | partial object | deepPartial object"),
        () => {
            const ObjectSchema = t.object({
                hello: t.string,
                world: t.number,
                nested: t.object({
                    deeply: t.boolean,
                    union: t.union(t.string, t.number.array),
                    tuple: t.tuple([t.string, t.number]),
                    "depth2?": t.union(
                        t
                            .object({
                                "hello?": t.array(
                                    t.union(
                                        t.string,
                                        t.object({
                                            a: t.string,
                                        })
                                    )
                                ),
                                world: t.string,
                            })
                            .optional(),
                        t.number,
                        t.array(t.string)
                    ),
                }),
            })
            type ObjectSchema = Infer<typeof ObjectSchema>
            type ObjExpected = {
                hello: string
                world: number
                nested: {
                    deeply: boolean
                    union: string | number[]
                    tuple: readonly [string, number]
                    depth2?:
                        | {
                              hello?: (string | { a: string })[] | undefined
                              world: string
                          }
                        | undefined
                        | number
                        | string[]
                }
            }
            expectType<TypeEqual<ObjectSchema, ObjExpected>>(true)

            const PartialObject = ObjectSchema.partial()
            type PartialObjectSchema = Infer<typeof PartialObject>
            type PartialExpected = {
                hello?: string
                world?: number
                nested?: {
                    deeply: boolean
                    union: string | number[]
                    tuple: readonly [string, number]
                    depth2?:
                        | {
                              hello?: (string | { a: string })[] | undefined
                              world: string
                          }
                        | undefined
                        | number
                        | string[]
                }
            }
            expectType<TypeEqual<PartialObjectSchema, PartialExpected>>(true)

            const DeepPartialObject = ObjectSchema.deepPartial().strict()
            type DeepPartialObjectSchema = Infer<typeof DeepPartialObject>
            type Expected = {
                hello?: string
                world?: number
                nested?: {
                    deeply?: boolean
                    union?: string | number[]
                    tuple?: readonly [string, number]
                    depth2?:
                        | {
                              hello?: (string | { a: string })[] | undefined
                              world: string
                          }
                        | undefined
                        | number
                        | string[]
                }
            }
            expectType<TypeEqual<DeepPartialObjectSchema, Expected>>(true)
        }
    )

    it(label.case("should infer transformed object"), () => {
        const objectSchema = t.object({
            hello: t.string,
            world: t.number,
            nested: t.object({
                deeply: t.boolean,
                union: t.union(t.string, t.number),
                tuple: t.tuple([t.string, t.number]),
                "depth2?": t.union(
                    t.object({ hello: t.string }).nullish(),
                    t.number,
                    t.array(t.string)
                ),
                "b?": t.array(
                    t.array(
                        t.array(
                            t
                                .object({
                                    hello: t.string,
                                    hi: t.boolean,
                                    b: t.array(
                                        t
                                            .array(
                                                t
                                                    .union(t.string, t.number)
                                                    .optional()
                                            )
                                            .optional()
                                    ),
                                })
                                .deepPartial()
                        )
                    )
                ),
            }),
        })

        type ObjectSchema = Infer<typeof objectSchema>
        type Expected = {
            hello: string
            world: number
            nested: {
                deeply: boolean
                union: string | number
                tuple: readonly [string, number]
                depth2?: { hello: string } | number | string[] | null
                b?: {
                    hello?: string
                    hi?: boolean
                    b?: ((string | number | undefined)[] | undefined)[]
                }[][][]
            }
        }
        const parsed = objectSchema.parse({
            hello: "",
            world: 1,
            nested: {
                deeply: false,
                union: "",
                tuple: ["", 1],
                depth2: 1,
                b: [[[]]],
            },
        })
        expectType<TypeEqual<typeof parsed, ObjectSchema>>(true)
        expectType<TypeEqual<ObjectSchema, Expected>>(true)
    })

    it(label.case("should infer deeply nested combination"), () => {
        const arraySchema = t
            .array(
                t.array(
                    t.array(
                        t.object({
                            hello: t.string,
                            hi: t.boolean,
                            b: t.array(
                                t.union(
                                    t.array(t.union(t.string, t.number)),
                                    t.string
                                )
                            ),
                            "c?": t.tuple([
                                t.string,
                                t.number,
                                t.object({
                                    a: t.union(
                                        t.string,
                                        t.number,
                                        t.union(
                                            t.string,
                                            t.number,
                                            t.object({
                                                a: t.string,
                                                b: t.tuple([
                                                    t.string,
                                                    t.null,
                                                    t.tuple([
                                                        t.string,
                                                        t.object({
                                                            hello: t.string,
                                                            hi: t.boolean,
                                                            b: t.array(
                                                                t.union(
                                                                    t.array(
                                                                        t.union(
                                                                            t.string,
                                                                            t.number
                                                                        )
                                                                    ),
                                                                    t.object({
                                                                        hello: t.string,
                                                                        hi: t.boolean,
                                                                        b: t.array(
                                                                            t.union(
                                                                                t.string,
                                                                                t.number
                                                                            )
                                                                        ),
                                                                    })
                                                                )
                                                            ),
                                                        }),
                                                    ]),
                                                ]),
                                            })
                                        )
                                    ),
                                    name: t.literal("Name"),
                                }),
                            ]),
                        })
                    )
                )
            )
            .nullish()
            .transform((e) => ({
                a: "",
                b: "".split(" "),
                es: e?.map((e) => e),
            }))
        type ArraySchema = Infer<typeof arraySchema>
        type Expected = {
            a: string
            b: string[]
            es:
                | {
                      hello: string
                      hi: boolean
                      b: (string | (string | number)[])[]
                      c?: readonly [
                          string,
                          number,
                          {
                              a:
                                  | string
                                  | number
                                  | {
                                        a: string
                                        b: readonly [
                                            string,
                                            null,
                                            readonly [
                                                string,
                                                {
                                                    hello: string
                                                    hi: boolean
                                                    b: (
                                                        | (string | number)[]
                                                        | {
                                                              hello: string
                                                              hi: boolean
                                                              b: (
                                                                  | string
                                                                  | number
                                                              )[]
                                                          }
                                                    )[]
                                                },
                                            ],
                                        ]
                                    }
                              name: "Name"
                          },
                      ]
                  }[][][]
                | undefined
        }
        const parsed = arraySchema.parse(null)
        expectType<TypeEqual<ArraySchema, typeof parsed>>(true)
        expectType<TypeEqual<ArraySchema, Expected>>(true)
    })

    it(label.case("should infer optional | nullish | nullable object"), () => {
        const objectNullable = t
            .object({
                "a?": t.string.nullish(),
                "b?": t.string.nullable(),
                "c?": t.string.optional(),
            })
            .nullable()
        type Schema = Infer<typeof objectNullable>
        expectType<
            TypeEqual<
                Schema,
                {
                    a?: string | null | undefined
                    b?: string | null
                    c?: string | undefined
                } | null
            >
        >(true)
        objectNullable.parse(null)
        objectNullable.parse({})
        objectNullable.parse({ a: null })
        objectNullable.parse({ a: undefined })
        objectNullable.parse({ b: null })
        objectNullable.parse({ b: undefined })
        objectNullable.parse({ c: undefined })
        objectNullable.parse({ c: null })
        objectNullable.parse({ a: "", b: "", c: "" })
        objectNullable.parse({ a: "", b: "" })
        objectNullable.parse({ a: "", c: "" })
        objectNullable.parse({ b: "", c: null })
        objectNullable.parse({ b: "", c: undefined })
    })

    it(label.case("should infer optional | nullish | nullable array"), () => {
        const arrayOptional = t.array(t.string.optional()).optional()
        type ArrayOptional = Infer<typeof arrayOptional>
        expectType<
            TypeEqual<ArrayOptional, (string | undefined)[] | undefined>
        >(true)
        arrayOptional.parse(undefined)
        arrayOptional.parse(["", undefined])
        arrayOptional.parse([undefined, undefined])

        const arrayNullish = t.array(t.string.nullish()).nullish()
        type ArrayNullish = Infer<typeof arrayNullish>
        expectType<
            TypeEqual<
                ArrayNullish,
                (string | null | undefined)[] | null | undefined
            >
        >(true)
        arrayNullish.parse(null)
        arrayNullish.parse(undefined)
        arrayNullish.parse(["", null])
        arrayNullish.parse(["", undefined])
        arrayNullish.parse([null, undefined])
        arrayNullish.parse([undefined, undefined])
        arrayNullish.parse([undefined, null])
        arrayNullish.parse([null, null])
    })

    it(label.case("should infer optional | nullish | nullable tuple"), () => {
        const tupleOptional = t
            .tuple([t.string.optional(), t.number.nullish()])
            .optional()
        type TupleOptional = Infer<typeof tupleOptional>
        expectType<
            TypeEqual<
                TupleOptional,
                | readonly [string | undefined, number | undefined | null]
                | undefined
            >
        >(true)
        tupleOptional.parse(undefined)
        tupleOptional.parse(["", 1])
        tupleOptional.parse(["", undefined])
        tupleOptional.parse([undefined, undefined])
        tupleOptional.parse([undefined, 1])

        const tupleNullish = t
            .tuple([t.string.nullish(), t.number.optional()])
            .nullish()

        type TupleNullish = Infer<typeof tupleNullish>
        expectType<
            TypeEqual<
                TupleNullish,
                | readonly [string | null | undefined, number | undefined]
                | null
                | undefined
            >
        >(true)
        tupleNullish.parse(null)
        tupleNullish.parse(undefined)
        tupleNullish.parse(["", 1])
        tupleNullish.parse(["", undefined])
        tupleNullish.parse([null, undefined])
        tupleNullish.parse([undefined, undefined])
        tupleNullish.parse([undefined, 1])
        tupleNullish.parse([null, 1])
        tupleNullish.parse([null, undefined])
    })
    it(label.case("should infer optional | nullish | nullable union"), () => {
        const unionNullish = t
            .union(t.string.nullish(), t.number.optional())
            .nullish()
        type UnionNullish = Infer<typeof unionNullish>
        expectType<TypeEqual<UnionNullish, string | number | null | undefined>>(
            true
        )
        unionNullish.parse(null)
        unionNullish.parse(undefined)
        unionNullish.parse(1)
        unionNullish.parse("")
    })
})
