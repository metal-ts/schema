/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from '../error'
import type { SchemaErrorStack } from '../error/schema.error.stack'
import type { WITH_MARK } from '../interface'
import { logSchema } from '../utils'
import {
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from './schema'

export class TupleSchema<
    const Input extends readonly SchemaShape[],
    const Output = Input,
> extends Schema<'TUPLE', Input, Output> {
    constructor(private readonly tupleShape: Input) {
        const tupleValidator: ValidationUnit<unknown> = (target, e) => {
            if (!Array.isArray(target)) {
                e.push({
                    error_type: 'tuple_error',
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        'Tuple must be an array'
                    ),
                })
                return false
            }

            const tupleSchemaLength = this.tupleShape.length
            const targetLength = target.length

            if (tupleSchemaLength !== targetLength) {
                e.push({
                    error_type: 'tuple_error',
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
                const schema = this.tupleShape[i]

                if (!schema || !schema.is(item)) {
                    e.push({
                        error_type: 'tuple_error',
                        message: MetalError.formatTypeError(
                            logSchema(this.schemaDetail),
                            target,
                            `[index ${i}]`
                        ),
                        tuple_index: i,
                        tuple_value: item,
                        tuple_expected_type: this.schemaDetail,
                    })
                    return false
                }
            }

            return true
        }

        super('TUPLE', tupleValidator)
        this.injectErrorStack(this.$errorStack)
    }

    /**
     * @description Get the tuple shape
     */
    public override get shape(): Input {
        return this.tupleShape.map((s) => s.clone()) as unknown as Input
    }

    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this.tupleShape.forEach((schema) => {
            schema.injectErrorStack(errorStack)
            super.injectErrorStack(errorStack)
        })
    }

    public override optional(): TupleSchema<Input, Output | undefined> {
        const optionalSchema = new TupleSchema<Input, Output | undefined>(
            this.tupleShape
        )
        this.setSchemaType(optionalSchema, 'optional')
        return optionalSchema
    }

    public override nullable(): TupleSchema<Input, Output | null> {
        const nullableSchema = new TupleSchema<Input, Output | null>(
            this.tupleShape
        )
        this.setSchemaType(nullableSchema, 'nullable')
        return nullableSchema
    }

    public override nullish(): TupleSchema<Input, Output | null | undefined> {
        const nullishSchema = new TupleSchema<Input, Output | null | undefined>(
            this.tupleShape
        )
        this.setSchemaType(nullishSchema, 'nullish')
        return nullishSchema
    }

    public override get schemaDetail(): SchemaInformation<
        WITH_MARK<'TUPLE'>,
        Array<SchemaInformation<string, unknown>>
    > {
        return {
            type: this.nameDetail,
            shape: this.tupleShape.map((schema) => schema.schemaDetail),
        }
    }
    public override clone(): TupleSchema<Input, Output> {
        return new TupleSchema(this.tupleShape)
    }
}
