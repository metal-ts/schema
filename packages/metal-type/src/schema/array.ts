/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import type { SchemaErrorStack } from "../error/schema.error.stack"
import { WITH_MARK } from "../interface"
import { logSchema } from "../utils"
import {
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"

export class ArraySchema<
    Input extends SchemaShape,
    Output = Input,
> extends Schema<"ARRAY", Input[], Output[]> {
    public constructor(private readonly arrayShape: Input) {
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

            const isValidArrayElement: boolean =
                target
                    .map((item, currentIndex) => {
                        const isValidType = this.arrayShape.is(item)
                        if (!isValidType) {
                            e.push({
                                error_type: "array_error",
                                message: MetalError.formatTypeError(
                                    this.type,
                                    target,
                                    `Array item at index ${currentIndex} must be ${logSchema(
                                        this.arrayShape.schemaDetail
                                    )}`
                                ),
                                array_index: currentIndex,
                                array_item: item,
                                array_expected_type:
                                    this.arrayShape.schemaDetail,
                            })
                        }
                        return isValidType
                    })
                    .includes(false) === false

            return isValidArrayElement
        }

        super("ARRAY", arrValidator)
        this.injectErrorStack(this.$errorStack)
    }

    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this.arrayShape.injectErrorStack(errorStack)
        super.injectErrorStack(errorStack)
    }

    public override get schemaDetail(): SchemaInformation<
        WITH_MARK<"ARRAY">,
        SchemaInformation<string, unknown>
    > {
        return {
            type: this.nameDetail,
            shape: this.arrayShape.schemaDetail,
        }
    }
}
