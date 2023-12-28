/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import type { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, RemoveOptionalMark, WITH_MARK } from "../interface"
import { logSchema, prettyPrint } from "../utils"
import { type PrimitiveSchema, literal } from "./primitives"
import {
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"
import { UnionSchema } from "./union"

export type ObjectSchemaRecord = Record<string, SchemaShape>
type ToPartial<T extends ObjectSchemaRecord> = {
    [K in keyof T]: T[K] extends Schema<infer Name, infer Input, infer Output>
        ? Schema<Name, Input | undefined, Output | undefined>
        : never
}
type ToDeepPartial<T extends ObjectSchemaRecord> = {
    [K in keyof T]: T[K] extends Schema<infer Name, infer Input, infer Output>
        ? Input extends ObjectSchemaRecord
            ? ToDeepPartial<Input> | undefined
            : Schema<Name, Input | undefined, Output | undefined>
        : never
}

type ObjectSchemaType = ObjectSchema<any, any>
export class ObjectSchema<
    Input extends ObjectSchemaRecord,
    Output = Input,
> extends Schema<"OBJECT", Input, Output> {
    public constructor(objectShape: Input) {
        const extraKeyValidator: ValidationUnit<Record<any, any>> = (
            target,
            e
        ) => {
            let isExtraKeyExists: boolean = false
            const extraKeys: string[] = []
            for (const key in target) {
                // TODO: why array includes is faster than set has?
                if (this.schemaKeys.includes(key)) continue
                isExtraKeyExists = true
                extraKeys.push(key)
            }
            if (isExtraKeyExists) {
                e.push({
                    error_type: "extra_key_at_object_error",
                    error_keys: extraKeys,
                    error_value: Object.entries(target).filter(
                        ([key, value]) => {
                            if (!extraKeys.includes(key)) return
                            return [key, value]
                        }
                    ),
                    expected_type: this.schemaDetail,
                    message: `extra key ${prettyPrint(
                        extraKeys
                    )} is included at ${logSchema(this.schemaDetail)}`,
                })
                return false
            }
            return true
        }
        const objectChecker: ValidationUnit<Record<any, any>> = (target, e) => {
            let validationSucceeded: boolean = true
            for (let i = 0; i < this.schemaKeys.length; i++) {
                const key = this.schemaKeys[i] as string
                const targetValue: unknown = target[key]
                const isValidObject: boolean =
                    this._objectShape[key]?.is(targetValue) ?? false

                if (!isValidObject) {
                    validationSucceeded = false
                    e.push({
                        message: MetalError.formatTypeError(
                            logSchema(this.schemaDetail),
                            target,
                            `[field "${key}"]`
                        ),
                        error_type: "object_value_error",
                        error_key: key,
                        error_value: targetValue,
                        expected_type: this.schemaDetail,
                    })
                }
            }

            return validationSucceeded
        }

        const objectValidator: ValidationUnit<unknown> = (target, e) => {
            // check target is object
            if (typeof target !== "object" || !target) {
                e.push({
                    message: MetalError.formatTypeError(
                        "object",
                        target,
                        `${target} is ${typeof target}`
                    ),
                    error_type: "invalid_object_error",
                    error_value: target,
                    expected_type: this.schemaDetail,
                })
                return false
            }

            // check schema by object parse mode
            if (this.isStrictMode)
                return extraKeyValidator(target, e) && objectChecker(target, e)

            return objectChecker(target, e)
        }

        super("OBJECT", objectValidator)

        this._objectShape = this.removeOptionalAtShape(objectShape) as Input
        this.injectErrorStack(this.$errorStack)
        this.schemaKeys = Object.keys(this._objectShape)
        this.schemaKeysSet = new Set(this.schemaKeys)
    }

    private isStrictMode: boolean = false
    private shouldFilterKeys: boolean = false

    /**
     * @description Set strict parse mode
     * @description Extra keys are not allowed
     */
    public strict(): this {
        this.isStrictMode = true
        return this
    }
    /**
     * @description Set loose parse mode
     * @description Extra keys are allowed
     * @default
     */
    public loose(): this {
        this.isStrictMode = false
        return this
    }
    /**
     * @description Set filter parse mode
     * @description Extra keys are filtered without warning
     * @example
     * ```ts
     * const User = object({
     *      name: string(),
     *      age: number(),
     * }).strict()
     *
     * const parsed = User.parse({
     *      name: "Danpacho",
     *      age: 20,
     *      extraKey: "will be removed", // will be removed
     * })
     * // parsed = { name: "Danpacho", age: 20 }
     * ```
     */
    public filter(): this {
        this.shouldFilterKeys = true
        return this
    }

    public override parse(target: unknown) {
        if (this.shouldFilterKeys) {
            const targetObj = target as Record<string, unknown>
            const filtered: Record<string, unknown> = {}
            for (const key in targetObj) {
                if (this.schemaKeysSet.has(key)) {
                    filtered[key] = targetObj[key]
                }
            }
            return super.parse(filtered)
        }
        return super.parse(target)
    }

    public override clone(): ObjectSchema<Input, Output> {
        return new ObjectSchema<Input, Output>(this._objectShape)
    }

    private removeOptionalAtShape = (
        shape: ObjectSchemaRecord
    ): ObjectSchemaRecord => {
        const newShape: ObjectSchemaRecord = Object.entries(
            shape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, schemaValue]) => {
            if (key.endsWith("?")) {
                const optionalRemovedKey = key.slice(0, -1)
                if (schemaValue.isOptional && schemaValue.isNullable) {
                    // optional & nullable
                    return newSchema
                } else if (schemaValue.isNullable && !schemaValue.isOptional) {
                    // nullable only
                    newSchema[optionalRemovedKey] = schemaValue.nullish()
                    return newSchema
                } else if (!schemaValue.isNullable && schemaValue.isOptional) {
                    // optional only -> skip
                    return newSchema
                }
                newSchema[optionalRemovedKey] = schemaValue.optional()
                return newSchema
            }
            newSchema[key] = schemaValue
            return newSchema
        }, {})
        return newShape
    }

    public override injectErrorStack = (errorStack: SchemaErrorStack): void => {
        Object.entries(this._objectShape).forEach(([, originalSchema]) => {
            originalSchema.injectErrorStack(errorStack)
            super.injectErrorStack(errorStack)
        })
    }

    /**
     * @description `Object` schema shape
     * @example
     * ```ts
     * const User = object({
     *    name: string(),
     *    age: number(),
     * })
     *
     * const MaleUser = object({
     *   ...User.shape,
     *   male: boolean(),
     * })
     * ```
     */
    public override get shape(): Input {
        return Object.entries(this._objectShape).reduce<ObjectSchemaRecord>(
            (acc, [key, value]) => {
                acc[key] = value.clone()
                return acc
            },
            {}
        ) as Input
    }
    private readonly _objectShape: Input
    private readonly schemaKeys: string[]
    private readonly schemaKeysSet: Set<string>
    public override get schemaDetail(): SchemaInformation<
        WITH_MARK<"OBJECT">,
        Record<string, SchemaInformation<string, unknown>>
    > {
        return {
            type: this.nameDetail,
            shape: Object.entries(this._objectShape).reduce<
                Record<string, SchemaInformation<string, unknown>>
            >((newSchema, [key, value]) => {
                newSchema[key] = value.schemaDetail
                return newSchema
            }, {}),
        }
    }

    private inheritOption(
        schema: ObjectSchemaType,
        type: "optional" | "nullish" | "nullable"
    ): void {
        schema.shouldFilterKeys = this.shouldFilterKeys
        schema.isStrictMode = this.isStrictMode
        this.setSchemaType(schema, type)
    }

    public override optional(): ObjectSchema<Input, Output | undefined> {
        const optionalSchema = new ObjectSchema<Input, Output | undefined>(
            this._objectShape
        )
        this.inheritOption(optionalSchema, "optional")
        return optionalSchema
    }

    public override nullish(): ObjectSchema<Input, Output | null | undefined> {
        const nullishSchema = new ObjectSchema<
            Input,
            Output | null | undefined
        >(this._objectShape)
        this.inheritOption(nullishSchema, "nullish")
        return nullishSchema
    }

    public override nullable(): ObjectSchema<Input, Output | null> {
        const nullableSchema = new ObjectSchema<Input, Output | null>(
            this._objectShape
        )
        this.inheritOption(nullableSchema, "nullable")
        return nullableSchema
    }

    /**
     * @description `Object` schema keys
     * @example
     * ```ts
     * const User = object({
     *    name: string(),
     *    age: number(),
     * })
     *
     * const UserKeys = User.keys()
     * // UserKeys = "name" | "age"
     * ```
     */
    public keyof() {
        const keys: Array<
            PrimitiveSchema<
                `LITERAL<${RemoveOptionalMark<
                    Exclude<keyof Input, number | symbol>
                >}>`,
                RemoveOptionalMark<Exclude<keyof Input, number | symbol>>,
                RemoveOptionalMark<Exclude<keyof Input, number | symbol>>
            >
        > = Object.keys(this._objectShape).map((key) =>
            literal(
                key as RemoveOptionalMark<Exclude<keyof Input, symbol | number>>
            )
        )
        return new UnionSchema(keys)
    }

    /**
     * @description pick keys from `Object` schema
     * @param keys `keyof` object schema
     */
    public pick<Key extends keyof Input & keyof Output>(
        ...keys: Key[]
    ): ObjectSchema<Pick<Input, Key>, Pick<Output, Key>> {
        const pickedSchema: Pick<Input, Key> = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (keys.includes(key as Key)) {
                newSchema[key] = value
            }
            return newSchema
        }, {}) as Pick<Input, Key>

        return new ObjectSchema<Pick<Input, Key>, Pick<Output, Key>>(
            pickedSchema
        )
    }

    /**
     * @description omit keys from `Object` schema
     * @param keys `keyof` object schema
     */
    public omit<Key extends keyof Input & keyof Output>(
        ...keys: Key[]
    ): ObjectSchema<Omit<Input, Key>, Omit<Output, Key>> {
        const omittedSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (!keys.includes(key as Key)) {
                newSchema[key] = value
            }
            return newSchema
        }, {}) as Omit<Input, Key>

        return new ObjectSchema<Omit<Input, Key>, Omit<Output, Key>>(
            omittedSchema
        )
    }

    /**
     * @description partial `Object` schema
     */
    public partial(): ObjectSchema<ToPartial<Input>> {
        const partialSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            const optional = value.optional()
            newSchema[key] = optional
            return newSchema
        }, {}) as ToPartial<Input>

        return new ObjectSchema<ToPartial<Input>>(partialSchema)
    }

    /**
     * @description deep partial `Object` schema
     */
    public deepPartial(): ObjectSchema<ToDeepPartial<Input>> {
        const partialSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (value instanceof ObjectSchema) {
                const optionalDeepPartialSchema = value.deepPartial().optional()
                newSchema[key] = optionalDeepPartialSchema
                return newSchema
            }
            newSchema[key] = value.optional()
            return newSchema
        }, {}) as ToDeepPartial<Input>

        return new ObjectSchema<ToDeepPartial<Input>>(partialSchema)
    }

    /**
     * @description extend `Object` schema
     * @param extendSchema extend target `Object` schema
     */
    public extend<ExtendedSchema extends ObjectSchemaType>(
        extendSchema: ExtendedSchema
    ): ObjectSchema<
        Input & Infer<ExtendedSchema>,
        Output & Infer<ExtendedSchema>
    > {
        const extendedSchema = Object.entries(
            extendSchema.shape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            newSchema[key] = value as unknown as SchemaShape
            return newSchema
        }, this._objectShape) as Input & Infer<ExtendedSchema>

        return new ObjectSchema<
            Input & Infer<ExtendedSchema>,
            Output & Infer<ExtendedSchema>
        >(extendedSchema)
    }
}

export type ObjectSchemaShape = ObjectSchema<any, any>
