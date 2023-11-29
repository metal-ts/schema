/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import { WITH_NAME_NOTATION } from "../interface/type"
import { Infer } from "../metal-type"
import { prettyPrint } from "../utils"
import {
    Schema,
    type SchemaShape,
    type TypescriptFeatures,
    ValidationUnit,
} from "./schema"

export class TupleSchema<
        Name extends WITH_NAME_NOTATION<"TUPLE">,
        const Input extends readonly SchemaShape[],
        const Output = Input,
    >
    extends Schema<Name, Input, Output>
    implements TypescriptFeatures
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
                            this.type,
                            target,
                            `Tuple item at index ${i} must be ${prettyPrint(
                                schema?.schemaDetail
                            )}`
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

        this.injectErrorStackToTupleSchema(_tupleShape)
        this._tupleShape = _tupleShape
    }

    public get tupleShape(): Input {
        return this._tupleShape.map((s) => s.clone()) as unknown as Input
    }

    public override get schemaDetail(): Array<unknown> {
        return this._tupleShape.map((schema) => schema.schemaDetail)
    }
    public override parse(target: unknown): Infer<Output> {
        if (this.internalValidator(target, this.$errorStack)) {
            const parsed: unknown[] = []
            for (let i = 0; i < this._tupleShape.length; i++) {
                const schema = this._tupleShape[i]
                parsed.push(schema!.parse((target as unknown[])[i]))
            }
            return parsed as Infer<Output>
        }

        throw new MetalError({
            code: "VALIDATION",
            expectedType: this.name,
            manager: this.$errorStack,
        })
    }

    private injectErrorStackToTupleSchema = (
        tupleSchema: readonly SchemaShape[]
    ): void => {
        tupleSchema.forEach((schema) => {
            if (schema instanceof Schema) {
                schema.injectErrorStack(this.$errorStack)
                return schema
            }
            return schema
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

export const tuple = <const InputType extends readonly SchemaShape[]>(
    tuple: InputType
): TupleSchema<"TUPLE", InputType, InputType> =>
    new TupleSchema<"TUPLE", InputType, InputType>("TUPLE", tuple)
