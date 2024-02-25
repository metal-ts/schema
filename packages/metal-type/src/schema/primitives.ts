import { MetalError } from "../error"
import type { PRIMITIVE_SCHEMA_NAMES } from "../interface/schema.names"
import { prettyPrint } from "../utils"
import { Schema, type ValidationUnit } from "./schema"
import { ArraySchema } from "."

export class PrimitiveSchema<
    Name extends PRIMITIVE_SCHEMA_NAMES,
    Input,
    Output = Input,
> extends Schema<Name, Input, Output> {
    constructor(name: Name, internalValidator: ValidationUnit<unknown>) {
        super(name, internalValidator)
    }
    public get array(): ArraySchema<this, this> {
        return new ArraySchema<this, this>(this)
    }

    public override clone(): PrimitiveSchema<Name, Input, Output> {
        return new PrimitiveSchema<Name, Input, Output>(
            this.name,
            this.internalValidator
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
                        `input ${prettyPrint(target)} must be ${String(literal)}`
                    ),
                })
            }
            return isLiteral
        }
    )

const createPrimitives =
    <Name extends PRIMITIVE_SCHEMA_NAMES, Input, Output = Input>(
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
                message: MetalError.formatTypeError(
                    "string",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
                message: MetalError.formatTypeError(
                    "number",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
            message: MetalError.formatTypeError(
                "date",
                target,
                `${prettyPrint(target)} is ${typeof target}`
            ),
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
                message: MetalError.formatTypeError(
                    "bigint",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
                message: MetalError.formatTypeError(
                    "boolean",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
                message: MetalError.formatTypeError(
                    "symbol",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
                message: MetalError.formatTypeError(
                    "undefined",
                    target,
                    `${prettyPrint(target)} is ${typeof target}`
                ),
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
            message: MetalError.formatTypeError(
                "null",
                target,
                `${prettyPrint(target)} is ${typeof target}`
            ),
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

const never = createPrimitives<"NEVER", never, never>("NEVER", (target, e) => {
    e.push({
        error_type: "never_error",
        message: MetalError.formatTypeError(
            "never",
            target,
            `${prettyPrint(target)} is ${typeof target}`
        ),
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
