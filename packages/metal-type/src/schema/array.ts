/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from '../error'
import type { SchemaErrorStack } from '../error/schema.error.stack'
import { WITH_MARK } from '../interface'
import { logSchema } from '../utils'
import {
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from './schema'

export class ArraySchema<
    Input extends SchemaShape,
    Output = Input,
> extends Schema<'ARRAY', Input[], Output[]> {
    public constructor(private readonly arrayShape: Input) {
        const arrValidator: ValidationUnit<unknown> = (target, e) => {
            if (!Array.isArray(target)) {
                e.push({
                    error_type: 'array_error',
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        'Array must be an typeof array'
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
                                error_type: 'array_error',
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

        super('ARRAY', arrValidator)
        this.injectErrorStack(this.$errorStack)
    }

    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this.arrayShape.injectErrorStack(errorStack)
        super.injectErrorStack(errorStack)
    }

    public override get schemaDetail(): SchemaInformation<
        WITH_MARK<'ARRAY'>,
        SchemaInformation<string, unknown>
    > {
        return {
            type: this.nameDetail,
            shape: this.arrayShape.schemaDetail,
        }
    }
    public override clone(): ArraySchema<Input, Output> {
        return new ArraySchema<Input, Output>(this.arrayShape)
    }

    public override optional(): Schema<'ARRAY', Input[], Output[] | undefined> {
        const optionalArray = new ArraySchema<Input, Output>(this.arrayShape)
        this.setSchemaType(optionalArray, 'optional')
        return optionalArray as unknown as Schema<
            'ARRAY',
            Input[],
            Output[] | undefined
        >
    }

    public override nullable(): Schema<'ARRAY', Input[], Output[] | null> {
        const nullableArray = new ArraySchema<Input, Output>(this.arrayShape)
        this.setSchemaType(nullableArray, 'nullable')
        return nullableArray as unknown as Schema<
            'ARRAY',
            Input[],
            Output[] | null
        >
    }

    public override nullish(): Schema<
        'ARRAY',
        Input[],
        Output[] | null | undefined
    > {
        const nullishArray = new ArraySchema<Input, Output>(this.arrayShape)
        this.setSchemaType(nullishArray, 'nullish')
        return nullishArray as unknown as Schema<
            'ARRAY',
            Input[],
            Output[] | null | undefined
        >
    }
}
