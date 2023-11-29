/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import type { WITH_NAME_NOTATION } from "../interface/type"
import { Infer } from "../metal-type"
import { prettyPrint } from "../utils"
import {
    Schema,
    type SchemaShape,
    type TypescriptFeatures,
    type ValidationUnit,
} from "./schema"

export class ArraySchema<
        Name extends WITH_NAME_NOTATION<"ARRAY">,
        Input extends SchemaShape,
        Output = Input,
    >
    extends Schema<Name, Input, Output>
    implements TypescriptFeatures
{
    public constructor(
        name: Name,
        public readonly arraySchema: Input,
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
                        const isValidType = this.arraySchema.is(item)
                        if (!isValidType) {
                            e.push({
                                error_type: "array_error",
                                message: MetalError.formatTypeError(
                                    this.type,
                                    target,
                                    `Array item at index ${currentIndex} must be ${prettyPrint(
                                        this.arraySchema.schemaDetail
                                    )}`
                                ),
                                array_index: currentIndex,
                                array_item: item,
                                array_expected_type:
                                    this.arraySchema.schemaDetail,
                            })
                        }
                        return isValidType
                    })
                    .includes(false) === false

            return isValidArrayElement || (extraValidator?.(target, e) ?? false)
        }

        super(name, arrValidator)
        this.arraySchema = arraySchema
    }

    public override parse(target: unknown): Infer<Output> {
        if (this.internalValidator(target, this.$errorStack)) {
            return (target as unknown[]).map(
                (e) => this.arraySchema.parse(e) as Infer<Output>
            ) as Infer<Output>
        }

        throw new MetalError({
            code: "VALIDATION",
            expectedType: this.name,
            manager: this.$errorStack,
        })
    }

    public override get schemaDetail(): Array<unknown> {
        return [this.arraySchema.schemaDetail]
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
                    this.arraySchema,
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
                    this.arraySchema,
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
                >("ARRAY | NULL | UNDEFINED", this.arraySchema, validator)
        )
}

export const array = <Input extends SchemaShape>(
    arraySchema: Input
): ArraySchema<"ARRAY", Input, Input> =>
    new ArraySchema<"ARRAY", Input, Input>("ARRAY", arraySchema)
