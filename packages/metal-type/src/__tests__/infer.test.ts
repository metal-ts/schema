import { type TypeEqual, expectType } from "ts-expect"
import { describe, it } from "vitest"
import { type Infer, t } from "../index"
import { label } from "./utils/test.label"

describe(label.unit("MetalType - Infer"), () => {
    it(label.case("should infer hyper complex object"), () => {
        const objectSchema = t.object({
            hello: t.string,
            world: t.number,
            nested: t.object({
                deeply: t.boolean,
                union: t.union(t.string, t.number),
                tuple: t.tuple([t.string, t.number]),
                "depth2?": t.union(
                    t.object({ hello: t.string }).optional(),
                    t.number,
                    t.array(t.string)
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
                depth2?: { hello: string } | number | string[]
            }
        }
        expectType<TypeEqual<ObjectSchema, Expected>>(true)
    })

    it(label.case("should infer transformed object"), () => {
        const objectSchema = t
            .object({
                hello: t.string,
                world: t.number,
                nested: t.object({
                    deeply: t.boolean,
                    union: t.union(t.string, t.number),
                    tuple: t.tuple([t.string, t.number]),
                    "depth2?": t.union(
                        t.object({ hello: t.string }).optional(),
                        t.number,
                        t.array(t.string)
                    ),
                    "b?": t.array(
                        t.array(
                            t.array(
                                t.object({
                                    hello: t.string,
                                    hi: t.boolean,
                                    b: t.array(
                                        t.array(t.union(t.string, t.number))
                                    ),
                                })
                            )
                        )
                    ),
                }),
            })
            .transform((value) => {
                return {
                    ...value,
                    me: value.hello.split(""),
                }
            })
        type ObjectSchema = Infer<typeof objectSchema>
        type Expected = {
            me: string[]
            hello: string
            world: number
            nested: {
                deeply: boolean
                union: string | number
                tuple: readonly [string, number]
                depth2?:
                    | number
                    | {
                          hello: string
                      }
                    | string[]
                    | undefined
                b?: {
                    hello: string
                    hi: boolean
                    b: (string | number)[][]
                }[][][]
            }
        }
        expectType<TypeEqual<ObjectSchema, Expected>>(true)
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
        expectType<TypeEqual<typeof parsed, Expected>>(true)
    })

    it(label.case("should infer deeply nested combination"), () => {
        const arraySchema = t.array(
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
        type ArraySchema = Infer<typeof arraySchema>
        const a: ArraySchema = [
            [
                [
                    {
                        b: ["a"],
                        hello: "",
                        hi: false,
                        c: [
                            "",
                            1,
                            {
                                a: {
                                    a: "a",
                                    b: [
                                        "a",
                                        null,
                                        [
                                            "a",
                                            {
                                                hello: "",
                                                hi: false,
                                                b: [["a"]],
                                            },
                                        ],
                                    ],
                                },
                                name: "Name",
                            },
                        ],
                    },
                ],
            ],
        ]
        type Expected = {
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
                                                    b: (string | number)[]
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
        expectType<TypeEqual<ArraySchema, Expected>>(true)
        expectType<TypeEqual<typeof a, Expected>>(true)
        const parsed = arraySchema.parse(a)
        expectType<TypeEqual<typeof parsed, Expected>>(true)
    })
})
