/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, WITH_NAME_NOTATION } from "../interface"
import { logSchema } from "../utils"
import {
    type AbstractSchema,
    Schema,
    SchemaInformation,
    type SchemaShape,
    ValidationUnit,
} from "./schema"

export class TupleSchema<
        Name extends WITH_NAME_NOTATION<"TUPLE">,
        const Input extends readonly SchemaShape[],
        const Output = Input,
    >
    extends Schema<Name, Input, Output>
    implements AbstractSchema
{
    constructor(
        name: Name,
        private readonly _tupleShape: Input,
        extraValidator?: ValidationUnit<unknown>
    ) {
        const tupleValidator: ValidationUnit<unknown> = (target, e) => {
            if (!Array.isArray(target)) {
                e.push({
                    error_type: "tuple_error",
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        "Tuple must be an array"
                    ),
                })
                return false
            }

            const tupleSchemaLength = this._tupleShape.length
            const targetLength = target.length

            if (tupleSchemaLength !== targetLength) {
                e.push({
                    error_type: "tuple_error",
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        `Tuple length must be ${tupleSchemaLength}`
                    ),
                })
                return false
            }

            for (let i = 0; i < tupleSchemaLength; i++) {
                const item = target[i]
                const schema = this._tupleShape[i]

                if (!schema || !schema.is(item)) {
                    e.push({
                        error_type: "tuple_error",
                        message: MetalError.formatTypeError(
                            logSchema(schema!.schemaDetail),
                            target,
                            `Check tuple index ${i}`
                        ),
                        tuple_index: i,
                        tuple_value: item,
                        tuple_expected_type: schema?.schemaDetail,
                    })
                    return false
                }
            }

            if (extraValidator) extraValidator(target, e)

            return true
        }

        super(name, tupleValidator)
        this.injectErrorStack(this.$errorStack)
    }

    /**
     * @description Get the tuple shape
     */
    public get shape(): Input {
        return this._tupleShape.map((s) => s.clone()) as unknown as Input
    }

    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this._tupleShape.forEach((schema) => {
            schema.injectErrorStack(errorStack)
            super.injectErrorStack(errorStack)
        })
    }

    public override get schemaDetail(): SchemaInformation<
        Name,
        Array<SchemaInformation<string, unknown>>
    > {
        return {
            type: this.name,
            shape: this._tupleShape.map((schema) => schema.schemaDetail),
        }
    }
    public override parse(target: unknown): Infer<Schema<Name, Input, Output>> {
        if (this.internalValidator(target, this.$errorStack)) {
            const parsed: unknown[] = []
            for (let i = 0; i < this._tupleShape.length; i++) {
                const schema = this._tupleShape[i]
                parsed.push(schema?.parse((target as unknown[])[i]))
            }
            return parsed as Infer<Schema<Name, Input, Output>>
        }

        throw new MetalError({
            code: "VALIDATION",
            expectedType: this.name,
            manager: this.$errorStack,
        })
    }

    public optional = (): TupleSchema<
        "TUPLE | UNDEFINED",
        Input,
        Input | undefined
    > =>
        this.createOptional<
            TupleSchema<"TUPLE | UNDEFINED", Input, Input | undefined>
        >(
            (validator) =>
                new TupleSchema<"TUPLE | UNDEFINED", Input, Input | undefined>(
                    "TUPLE | UNDEFINED",
                    this._tupleShape,
                    validator
                )
        )

    public nullish = (): TupleSchema<
        "TUPLE | NULL | UNDEFINED",
        Input,
        Input | null | undefined
    > =>
        this.createNullish<
            TupleSchema<
                "TUPLE | NULL | UNDEFINED",
                Input,
                Input | null | undefined
            >
        >(
            (validator) =>
                new TupleSchema<
                    "TUPLE | NULL | UNDEFINED",
                    Input,
                    Input | null | undefined
                >("TUPLE | NULL | UNDEFINED", this._tupleShape, validator)
        )

    public nullable = (): TupleSchema<"TUPLE | NULL", Input, Input | null> =>
        this.createNullable<TupleSchema<"TUPLE | NULL", Input, Input | null>>(
            (validator) =>
                new TupleSchema<"TUPLE | NULL", Input, Input | null>(
                    "TUPLE | NULL",
                    this._tupleShape,
                    validator
                )
        )
}
