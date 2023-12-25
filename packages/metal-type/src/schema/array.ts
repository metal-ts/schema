/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import type { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, WITH_NAME_NOTATION } from "../interface"
import { logSchema } from "../utils"
import {
    type AbstractSchema,
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"

export class ArraySchema<
        Name extends WITH_NAME_NOTATION<"ARRAY">,
        Input extends SchemaShape,
        Output = Input,
    >
    extends Schema<Name, Input[], Output[]>
    implements AbstractSchema
{
    public constructor(
        name: Name,
        private readonly _arrayShape: Input,
        extraValidator?: ValidationUnit<unknown>
    ) {
        const arrValidator: ValidationUnit<unknown> = (target, e) => {
            if (!Array.isArray(target)) {
                e.push({
                    error_type: "array_error",
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        "Array must be an typeof array"
                    ),
                })
                return false
            }

            const isValidArrayElement =
                target
                    .map((item, currentIndex) => {
                        const isValidType = this._arrayShape.is(item)
                        if (!isValidType) {
                            e.push({
                                error_type: "array_error",
                                message: MetalError.formatTypeError(
                                    this.type,
                                    target,
                                    `Array item at index ${currentIndex} must be ${logSchema(
                                        this._arrayShape.schemaDetail
                                    )}`
                                ),
                                array_index: currentIndex,
                                array_item: item,
                                array_expected_type:
                                    this._arrayShape.schemaDetail,
                            })
                        }
                        return isValidType
                    })
                    .includes(false) === false

            return isValidArrayElement || (extraValidator?.(target, e) ?? false)
        }

        super(name, arrValidator)
        this.injectErrorStack(this.$errorStack)
    }

    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this._arrayShape.injectErrorStack(errorStack)
        super.injectErrorStack(errorStack)
    }

    public override parse(
        target: unknown
    ): Infer<Schema<Name, Input[], Output[]>> {
        if (this.internalValidator(target, this.$errorStack)) {
            return (target as unknown[]).map((e) =>
                this._arrayShape.parse(e)
            ) as Infer<Schema<Name, Input[], Output[]>>
        }

        throw new MetalError({
            code: "VALIDATION",
            expectedType: this.name,
            manager: this.$errorStack,
        })
    }

    public get shape(): Input {
        return this._arrayShape.clone() as Input
    }

    public override get schemaDetail(): SchemaInformation<Name, unknown> {
        return {
            type: this.name,
            shape: this._arrayShape.schemaDetail,
        }
    }

    public nullish = (): ArraySchema<
        "ARRAY | UNDEFINED",
        Input,
        Input | null
    > =>
        this.createNullish(
            (validator) =>
                new ArraySchema<"ARRAY | UNDEFINED", Input, Input | null>(
                    "ARRAY | UNDEFINED",
                    this._arrayShape,
                    validator
                )
        )

    public nullable = (): ArraySchema<
        "ARRAY | NULL",
        Input,
        Input | undefined
    > =>
        this.createNullable(
            (validator) =>
                new ArraySchema<"ARRAY | NULL", Input, Input | undefined>(
                    "ARRAY | NULL",
                    this._arrayShape,
                    validator
                )
        )

    public optional = (): ArraySchema<
        "ARRAY | NULL | UNDEFINED",
        Input,
        Input | null | undefined
    > =>
        this.createOptional(
            (validator) =>
                new ArraySchema<
                    "ARRAY | NULL | UNDEFINED",
                    Input,
                    Input | null | undefined
                >("ARRAY | NULL | UNDEFINED", this._arrayShape, validator)
        )
}
