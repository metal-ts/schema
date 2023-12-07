import { MetalError } from "../error"
import type { PRIMITIVES_UNIT_NAMES } from "../interface/type"
import { Schema, type TypescriptFeatures, type ValidationUnit } from "./schema"

export class PrimitiveSchema<
        Name extends PRIMITIVES_UNIT_NAMES,
        Input,
        Output = Input,
    >
    extends Schema<Name, Input, Output>
    implements TypescriptFeatures
{
    constructor(name: Name, internalValidator: ValidationUnit<unknown>) {
        super(name, internalValidator)
    }

    public optional(): PrimitiveSchema<Name, Input, Output | undefined> {
        const optionalSchemaValidator: ValidationUnit<unknown> = (
            target,
            e
        ) => {
            const isUndefined = typeof target === "undefined"
            if (isUndefined === false) {
                e.push({
                    error_type: "undefined_error",
                    message: MetalError.formatTypeError(this.type, target),
                })
            }
            const baseTest = this.internalValidator(target, e)
            return isUndefined || baseTest
        }

        return new PrimitiveSchema<Name, Input, Output | undefined>(
            `${this.name} | UNDEFINED` as Name,
            optionalSchemaValidator
        )
    }

    public nullable(): PrimitiveSchema<Name, Input, Output | null> {
        const nullableSchemaValidator: ValidationUnit<unknown> = (
            target,
            e
        ) => {
            const isNull = target === null
            if (isNull === false) {
                e.push({
                    error_type: "null_error",
                    message: MetalError.formatTypeError(this.type, target),
                })
            }
            const baseTest = this.internalValidator(target, e)
            return isNull || baseTest
        }

        return new PrimitiveSchema<Name, Input, Output | null>(
            `${this.name} | NULL` as Name,
            nullableSchemaValidator
        )
    }

    public nullish(): PrimitiveSchema<Name, Input, Output | null | undefined> {
        const nullishSchemaValidator: ValidationUnit<unknown> = (target, e) => {
            const isNullish = target === null || typeof target === "undefined"
            if (isNullish === false) {
                e.push({
                    error_type: "nullish_error",
                    message: MetalError.formatTypeError(this.type, target),
                })
            }
            const baseTest = this.internalValidator(target, e)
            return isNullish || baseTest
        }

        return new PrimitiveSchema<Name, Input, Output | null | undefined>(
            `${this.name} | NULL | UNDEFINED` as Name,
            nullishSchemaValidator
        )
    }
}

const literal = <const Literal extends string | number | boolean>(
    literal: Literal
): PrimitiveSchema<`LITERAL<${Literal}>`, Literal, Literal> =>
    new PrimitiveSchema<`LITERAL<${Literal}>`, Literal, Literal>(
        `LITERAL<${literal}>`,
        (target: unknown, e) => {
            const isLiteral = target === literal
            if (!isLiteral) {
                e.push({
                    error_type: "literal_error",
                    message: MetalError.formatTypeError(
                        "literal",
                        target,
                        `Input must be ${String(literal)}`
                    ),
                })
            }
            return isLiteral
        }
    )

const createPrimitives =
    <Name extends PRIMITIVES_UNIT_NAMES, Input, Output = Input>(
        name: Name,
        internalValidator: ValidationUnit<unknown>
    ) =>
    (): PrimitiveSchema<Name, Input, Output> =>
        new PrimitiveSchema<Name, Input, Output>(name, internalValidator)

const string = createPrimitives<"STRING", string, string>(
    "STRING",
    (target, e) => {
        const isString = typeof target === "string"
        if (!isString) {
            e.push({
                error_type: "string_error",
                message: MetalError.formatTypeError("string", target),
            })
        }
        return isString
    }
)

const number = createPrimitives<"NUMBER", number, number>(
    "NUMBER",
    (target, e) => {
        const isNumber = typeof target === "number"
        if (!isNumber) {
            e.push({
                error_type: "number_error",
                message: MetalError.formatTypeError("number", target),
            })
        }
        return isNumber
    }
)

const date = createPrimitives<"DATE", Date, Date>("DATE", (target, e) => {
    const isDate = target instanceof Date
    if (!isDate) {
        e.push({
            error_type: "date_error",
            message: MetalError.formatTypeError("date", target),
        })
    }
    return isDate
})

const bigint = createPrimitives<"BIGINT", bigint, bigint>(
    "BIGINT",
    (target, e) => {
        const isBigInt = typeof target === "bigint"
        if (!isBigInt) {
            e.push({
                error_type: "bigint_error",
                message: MetalError.formatTypeError("bigint", target),
            })
        }
        return isBigInt
    }
)

const boolean = createPrimitives<"BOOLEAN", boolean, boolean>(
    "BOOLEAN",
    (target, e) => {
        const isBoolean = typeof target === "boolean"
        if (!isBoolean) {
            e.push({
                error_type: "boolean_error",
                message: MetalError.formatTypeError("boolean", target),
            })
        }
        return isBoolean
    }
)

const symbol: () => PrimitiveSchema<"SYMBOL", symbol, symbol> =
    createPrimitives<"SYMBOL", symbol, symbol>("SYMBOL", (target, e) => {
        const isSymbol = typeof target === "symbol"
        if (!isSymbol) {
            e.push({
                error_type: "symbol_error",
                message: MetalError.formatTypeError("symbol", target),
            })
        }
        return isSymbol
    })

const _undefined = createPrimitives<"UNDEFINED", undefined, undefined>(
    "UNDEFINED",
    (target, e) => {
        const isUndefined = typeof target === "undefined"
        if (!isUndefined) {
            e.push({
                error_type: "undefined_error",
                message: MetalError.formatTypeError("undefined", target),
            })
        }
        return isUndefined
    }
)

const _null = createPrimitives<"NULL", null, null>("NULL", (target, e) => {
    const isNull = target === null
    if (!isNull) {
        e.push({
            error_type: "null_error",
            message: MetalError.formatTypeError("null", target),
        })
    }
    return isNull
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const any = createPrimitives<"ANY", any, any>("ANY", () => true)

const unknown = createPrimitives<"UNKNOWN", unknown, unknown>(
    "UNKNOWN",
    () => true
)

const never = createPrimitives<"NEVER", never, never>("NEVER", (_target, e) => {
    e.push({
        error_type: "never_error",
        message: MetalError.formatTypeError("never", _target),
    })
    return false
})

export {
    // js primitives
    string,
    number,
    boolean,
    bigint,
    symbol,
    date,
    _undefined as undefined,
    _null as null,
    // ts primitives
    literal,
    any,
    unknown,
    never,
}
