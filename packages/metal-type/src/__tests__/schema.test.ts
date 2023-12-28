import { describe, expect, it } from "vitest"
import { MetalError } from "../error"
import { Schema, t, transformer, validator } from "../index"
import { label } from "./utils/test.label"

const isEmail = validator((target, error) => {
    if (typeof target !== "string") {
        error.push({
            error_type: "email_type_error",
            message: "Email should be string",
            value: target,
        })
        return false
    }

    const emailRegex = /\S+@\S+\.\S+/
    const isValidEmail = emailRegex.test(target)
    if (!isValidEmail) {
        error.push({
            error_type: "invalid_email_error",
            message: `"${target}" is not valid email format`,
        })
    }
    return isValidEmail
})

const max = (maxNum: number) =>
    validator((target: string, error) => {
        if (target.length > maxNum) {
            error.push({
                error_type: "max_length_error",
                message: `Max length is ${maxNum}, but got ${target.length}`,
            })
            return false
        }
        return true
    })
const min = (minNum: number) =>
    validator((target: string, error) => {
        if (target.length < minNum) {
            error.push({
                error_type: "min_length_error",
                message: `Min length is ${minNum}, but got ${target.length}`,
            })
            return false
        }
        return true
    })

const toCamelCase = transformer((target: string) => {
    const camelCased = target.replace(/([-_][a-z])/gi, ($1) =>
        $1.toUpperCase().replace("-", "").replace("_", "")
    )
    return camelCased as `${string}@${string}.${string}`
})

const toEmailInfo = transformer((target: `${string}@${string}.${string}`) => ({
    email: target,
    length: target.length,
}))

const Email = new Schema<"EMAIL", string, `${string}@${string}.${string}`>(
    "EMAIL",
    isEmail
)

describe(label.unit("MetalType - Schema base"), () => {
    it(label.case("should parse email correctly -> strict"), () => {
        const validEmail = Email.parse("email@gmail.com")
        expect(validEmail).toEqual("email@gmail.com")
    })

    it(label.case("should run validation pipes correctly -> strict"), () => {
        try {
            const maxSchema = Email.validate(max(10))
            maxSchema.parse("toomuch@gmail.com")
        } catch (e) {
            if (e instanceof MetalError) {
                expect(e.message).toEqual(
                    "[Err_1] max_length_error Max length is 10, but got 17"
                )
            }
        }

        try {
            const boundarySchema = Email.validate(min(10), max(20))
            boundarySchema.parse("longlonglong@gmail.com")
        } catch (e) {
            if (e instanceof MetalError) {
                expect(e.message).toEqual(
                    "[Err_1] max_length_error Max length is 20, but got 22"
                )
            }
        }
    })

    it(label.case("should run safeParse correctly -> safe"), () => {
        const validEmail = Email.safeParse("test.abs.com", "default@email.com")
        expect(validEmail.value).toEqual("default@email.com")
        expect(validEmail.success).toEqual(false)
        if (!validEmail.success) {
            expect(validEmail.cause).toStrictEqual([
                {
                    code: "VALIDATION",
                    error_type: "VALIDATION",
                    message:
                        'Validation error occurred, [Err_1] invalid_email_error "test.abs.com" is not valid email format',
                },
                {
                    error_type: "invalid_email_error",
                    message: '"test.abs.com" is not valid email format',
                },
            ])
        }
    })

    it(label.case("should transform value softly -> strict"), () => {
        const camelCasedEmail = Email.transform(toCamelCase).parse(
            "alpha_beta@email.com"
        )
        expect(camelCasedEmail).toEqual("alphaBeta@email.com")
    })

    it(label.case("should transform value hardly -> strict"), () => {
        const WithEmailInfo = Email.transform(toEmailInfo)
        const emailInfo = WithEmailInfo.parse("alpha_beta@email.com")
        expect(emailInfo).toEqual({
            email: "alpha_beta@email.com",
            length: "alpha_beta@email.com".length,
        })
    })

    it(label.case("should transformHard schema correctly -> strict"), () => {
        const User = Email.transformHard((prev) => {
            return t.object({
                type: t.literal("email"),
                value: t.string,
                email: prev.transform(toCamelCase).validate(max(20)),
            })
        }).transformHard((prev) => {
            return t.object({
                type: t.literal("email"),
                value: t.string,
                email: prev,
            })
        })
        expect(User.type).toEqual("object")
        const parsedUser = User.parse({
            type: "email",
            value: "just pure string parser",
            email: {
                type: "email",
                value: "just pure string parser",
                email: "newschema@gmail.com",
            },
        })
        expect(parsedUser).toEqual({
            type: "email",
            value: "just pure string parser",
            email: {
                type: "email",
                value: "just pure string parser",
                email: "newschema@gmail.com",
            },
        })
    })
})
