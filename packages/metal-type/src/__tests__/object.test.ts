import { describe, expect, it } from "vitest"
import { t } from ".."
import { label } from "./utils/test.label"

const isEmail: t.ValidationUnit<string> = (target, error) => {
    //email regex
    const emailRegex = /\S+@\S+\.\S+/
    const isValidEmail = emailRegex.test(target)
    if (!isValidEmail) {
        error.push({
            error_type: "email_error",
            message: `${target} is not valid email format"`,
        })
    }
    return isValidEmail
}

const min =
    (minN: number): t.ValidationUnit<string> =>
    (target, error) => {
        const isMin = target.length >= minN
        if (!isMin) {
            error.push({
                error_type: "min_error",
                message: `expected at least ${minN} characters, but got ${target.length} at ${target}`,
            })
        }
        return isMin
    }

const max =
    (maxN: number): t.ValidationUnit<string> =>
    (target, error) => {
        const isMax = target.length <= maxN
        if (!isMax) {
            error.push({
                error_type: "max_error",
                message: `expected at most ${maxN} characters, but got ${target.length} at ${target}`,
            })
        }
        return isMax
    }

describe(label.unit("MetalType - ObjectSchema"), () => {
    it(label.case("should parse object -> strict"), () => {
        const TestSchema = t
            .object({
                x: t.string().validate(isEmail, min(2), max(20)),
                y: t.number(),
                value1: t.object({
                    "x?": t.number(),
                    y: t.number(),
                    z: t.number(),
                    value2: t.object({
                        "x?": t.number(),
                        "y?": t.number(),
                        z: t.literal("ChangeThat"),
                    }),
                    t: t.union(t.literal("a"), t.number()),
                }),
            })
            .strict()

        const parsed = TestSchema.parse({
            x: "danpa@gmail.com",
            y: 2,
            value1: {
                y: 2,
                z: 10,
                value2: {
                    z: "ChangeThat",
                },
                t: "a",
            },
        })
        expect(parsed).toStrictEqual({
            x: "danpa@gmail.com",
            y: 2,
            value1: {
                y: 2,
                z: 10,
                value2: {
                    z: "ChangeThat",
                },
                t: "a",
            },
        })
    })

    it(label.case("should parse object -> filter"), () => {
        const FilterSchema = t
            .object({
                number: t.number(),
                negNumber: t.number(),
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .filter()

        const validateData = {
            number: 1,
            negNumber: -1,
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            fang: "foo", // should be filtered
        }

        const validated = FilterSchema.parse(validateData)
        expect(validated).toStrictEqual({
            number: 1,
            negNumber: -1,
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
        })
    })

    it(label.case("should parse object -> extra key is disabled"), () => {
        const StrictSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .strict()

        const validateData = {
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            fang: "foo", // should be filtered
        }

        expect(() => StrictSchema.parse(validateData)).toThrowError()
    })

    it(label.case("should parse object -> extra key is allowed"), () => {
        const StrictSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .loose()

        const validateData = {
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            fang: "foo", // will be included
        }

        const validated = StrictSchema.parse(validateData)
        expect(validated).toStrictEqual({
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            fang: "foo",
        })
    })

    it(label.case("should parse object -> partial"), () => {
        const PartialSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .partial()

        const validateData = {
            deeplyNested: undefined,
        }
        const validated = PartialSchema.parse(validateData)
        expect(validated).toStrictEqual({
            deeplyNested: undefined,
        })
    })

    it(label.case("should deep clone shape -> zero side effect"), () => {
        const TestSchema = t
            .object({
                x: t.string().validate(isEmail, min(2), max(20)),
                y: t.number(),
                value1: t.object({
                    "x?": t.number(),
                    y: t.number(),
                    z: t.number(),
                    value2: t.object({
                        "x?": t.number(),
                        "y?": t.number(),
                        z: t.literal("ChangeThat"),
                    }),
                    t: t.union(t.literal("a"), t.number()),
                }),
            })
            .strict()

        const copied = TestSchema.shape
        // it can be modified by javascript, but it's not recommended
        // @ts-expect-error readonly property, can't be modified by typescript
        copied.x = t.number() // TestSchema should not be changed
        expect(TestSchema.shape.x).toEqual(t.string())
        expect(copied.x).toEqual(t.number())
    })

    it(label.case("should parse object -> deep partial & strict"), () => {
        const DeepPartialSchema = t
            .object({
                name: t.literal("name"),
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                    nested: t.object({
                        foo: t.string(),
                        num: t.number(),
                        bool: t.boolean(),
                        nested: t
                            .object({
                                foo: t.string(),
                                num: t.number(),
                                bool: t.boolean(),
                            })
                            .filter(),
                    }),
                }),
            })
            .deepPartial()
            .strict()

        expect(() =>
            DeepPartialSchema.parse({
                boy: undefined, // extra key should throw error
            })
        ).toThrowError("")
    })
    it(
        label.case(
            // deeply recursive object parsing is slow, so we should avoid it
            "should parse object -> deep partial & nested filter ignored for performance"
        ),
        () => {
            const DeepPartialSchema = t
                .object({
                    name: t.literal("name"),
                    maxNumber: t.number(),
                    string: t.string(),
                    longString: t.string(),
                    boolean: t.boolean(),
                    deeplyNested: t.object({
                        foo: t.string(),
                        num: t.number(),
                        bool: t.boolean(),
                        nested: t.object({
                            foo: t.string(),
                            num: t.number(),
                            bool: t.boolean(),
                            nested: t
                                .object({
                                    foo: t.string(),
                                    num: t.number(),
                                    bool: t.boolean(),
                                })
                                .filter(),
                        }),
                    }),
                })
                .deepPartial()
            const StrictDeepPartial = DeepPartialSchema.strict()

            const validateData = {
                name: "name",
                maxNumber: Number.MAX_VALUE,
                string: "string",
                longString: "Lorem",
                boolean: true,
                deeplyNested: {
                    foo: "bar",
                    num: 1,
                    bool: false,
                    nested: {
                        foo: "bar",
                        num: 1,
                        bool: false,
                        nested: {
                            foo: "bar",
                            num: 1,
                            bool: false,
                            THIS_WILL_BE_IGNORED: "foo",
                        },
                    },
                },
            }
            const validated = StrictDeepPartial.parse(validateData)

            expect(validated).toStrictEqual({
                name: "name",
                maxNumber: Number.MAX_VALUE,
                string: "string",
                longString: "Lorem",
                boolean: true,
                deeplyNested: {
                    foo: "bar",
                    num: 1,
                    bool: false,
                    nested: {
                        foo: "bar",
                        num: 1,
                        bool: false,
                        nested: {
                            foo: "bar",
                            num: 1,
                            bool: false,
                            THIS_WILL_BE_IGNORED: "foo",
                        },
                    },
                },
            })
        }
    )

    it(label.case("should parse object -> nullable"), () => {
        const NullableSchema = t
            .object({
                maxNumber: t.number(),
            })
            .nullable()

        const validateData = null
        const validated = NullableSchema.parse(validateData)
        expect(validated).toStrictEqual(null)
    })

    it(label.case("should parse object -> optional"), () => {
        const OptionalSchema = t
            .object({
                maxNumber: t.number(),
            })
            .optional()

        const validateData = undefined
        const validated = OptionalSchema.parse(validateData)
        expect(validated).toStrictEqual(undefined)
    })

    it(label.case("should parse object -> nullish"), () => {
        const NullishSchema = t
            .object({
                maxNumber: t.number(),
            })
            .nullish()

        const validateData = null
        const validated = NullishSchema.parse(validateData)
        expect(validated).toStrictEqual(null)
    })

    it(label.case("should parse object -> nullish"), () => {
        const OptionalNullableSchema = t
            .object({
                maxNumber: t.number(),
            })
            .nullish()

        const validateData = undefined
        const validated = OptionalNullableSchema.parse(validateData)
        expect(validated).toStrictEqual(undefined)
    })

    it(label.case("should pick object"), () => {
        const PickSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .pick("maxNumber", "string", "longString")
            .filter()

        const validateData = {
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
        }

        const validated = PickSchema.parse(validateData)
        expect(validated).toStrictEqual({
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
        })
    })

    it(label.case("should omit object"), () => {
        const OmitSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .omit("maxNumber", "string", "longString")
            .filter()

        const validateData = {
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
        }

        const validated = OmitSchema.parse(validateData)
        expect(validated).toStrictEqual({
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
        })
    })

    it(label.case("should extend object"), () => {
        const ExtendFirstSchema = t
            .object({
                hey: t.string(),
                hello: t.string(),
                hallo: t.string(),
            })
            .deepPartial()

        const ExtendSchema = t
            .object({
                maxNumber: t.number(),
                string: t.string(),
                longString: t.string(),
                boolean: t.boolean(),
                deeplyNested: t.object({
                    foo: t.string(),
                    num: t.number(),
                    bool: t.boolean(),
                }),
            })
            .extend(ExtendFirstSchema)

        const validateData = {
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            hello: "hello",
            hallo: "hallo",
        }

        const validated = ExtendSchema.parse(validateData)
        expect(validated).toStrictEqual({
            maxNumber: Number.MAX_VALUE,
            string: "string",
            longString: "Lorem",
            boolean: true,
            deeplyNested: {
                foo: "bar",
                num: 1,
                bool: false,
            },
            hello: "hello",
            hallo: "hallo",
        })
    })
})
