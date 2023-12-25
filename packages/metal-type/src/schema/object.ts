/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import { SchemaErrorStack } from "../error/schema.error.stack"
import type {
    Infer,
    RemoveOptionalMark,
    WITH_NAME_NOTATION,
} from "../interface"
import { logSchema, prettyPrint } from "../utils"
import { literal } from "./primitives"
import {
    type AbstractSchema,
    InferSchemaInputOutput,
    Schema,
    SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"
import { t } from "./t"
import { ArraySchema, PrimitiveSchema, TupleSchema, UnionSchema } from "."

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

type ObjectSchemaType = ObjectSchema<WITH_NAME_NOTATION<"OBJECT">, any, any>
export class ObjectSchema<
        Name extends WITH_NAME_NOTATION<"OBJECT">,
        Input extends ObjectSchemaRecord,
        Output = Input,
    >
    extends Schema<Name, Input, Output>
    implements AbstractSchema
{
    public constructor(
        name: Name,
        objectShape: Input,
        extraValidator?: ValidationUnit<unknown>
    ) {
        const extraKeyValidator: ValidationUnit<Record<any, any>> = (
            target,
            e
        ) => {
            const targetKeys = Object.keys(target)
            const extraKeys = targetKeys.filter(
                (key) => !this.schemaKeysSet.has(key)
            )
            if (extraKeys.length > 0) {
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
                        message: `Expected ${logSchema(
                            this.schemaDetail
                        )}, but received ${prettyPrint(
                            target
                        )}, check "${key}" field.`,
                        error_type: "object_value_error",
                        error_key: key,
                        error_value: targetValue,
                        expected_type: this.schemaDetail,
                    })
                }
            }

            if (validationSucceeded) return true
            return extraValidator?.(target, e) ?? false
        }

        const objectValidator: ValidationUnit<unknown> = (target, e) => {
            // check object parse mode for strict, loose, filter
            if (this.isOptional && target === undefined) return true
            if (this.isNullable && target === null) return true
            if (this.isNullable && this.isOptional && !target) return true

            // check target is object
            if (typeof target !== "object" || !target) {
                e.push({
                    message: MetalError.formatTypeError("object", target),
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

        super(name, objectValidator)

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
    public strict(): ObjectSchema<Name, Input, Output> {
        this.isStrictMode = true
        return this
    }
    /**
     * @description Set loose parse mode
     * @description Extra keys are allowed
     * @default
     */
    public loose(): ObjectSchema<Name, Input, Output> {
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
    public filter(): ObjectSchema<Name, Input, Output> {
        this.shouldFilterKeys = true
        return this
    }

    private isOptionalActiveInstance(
        target: SchemaShape
    ): target is
        | ObjectSchema<"OBJECT", any, any>
        | UnionSchema<"UNION", any, any>
        | ArraySchema<"ARRAY", any, any>
        | TupleSchema<"TUPLE", any, any>
        | PrimitiveSchema<"ANY", any, any> {
        return (
            target instanceof ObjectSchema ||
            target instanceof UnionSchema ||
            target instanceof ArraySchema ||
            target instanceof TupleSchema ||
            target instanceof PrimitiveSchema
        )
    }

    public override parse(target: unknown): Infer<Schema<Name, Input, Output>> {
        if (this.isStrictMode || !this.shouldFilterKeys || super.transformer) {
            return super.parse(target) as Infer<Schema<Name, Input, Output>>
        }

        const filterExtraKeys: Record<string, unknown> = {}
        for (const key in target as Record<string, unknown>) {
            if (this.schemaKeys.includes(key)) {
                filterExtraKeys[key] = (target as Record<string, unknown>)[key]
            }
        }
        return super.parse(filterExtraKeys) as Infer<
            Schema<Name, Input, Output>
        >
    }

    public override clone(): ObjectSchema<Name, Input, Output> {
        return new ObjectSchema<Name, Input, Output>(
            this.name,
            this._objectShape,
            this.internalValidator
        )
    }

    private removeOptionalAtShape = (
        shape: ObjectSchemaRecord
    ): ObjectSchemaRecord => {
        const newShape: ObjectSchemaRecord = Object.entries(
            shape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (key.endsWith("?") && this.isOptionalActiveInstance(value)) {
                const optionalRemovedKey = key.slice(0, -1)
                newSchema[optionalRemovedKey] = value.optional()
                return newSchema
            }
            newSchema[key] = value
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
    public get shape(): Input {
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
        Name,
        Record<string, SchemaInformation<string, unknown>>
    > {
        return {
            type: this.name,
            shape: Object.entries(this._objectShape).reduce<
                Record<string, SchemaInformation<string, unknown>>
            >((newSchema, [key, value]) => {
                newSchema[key] = value.schemaDetail
                return newSchema
            }, {}),
        }
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
        const keys = Object.keys(this._objectShape).map((key) =>
            literal(
                key as RemoveOptionalMark<Exclude<keyof Input, symbol | number>>
            )
        )
        return t.union(...keys)
    }

    /**
     * @description pick keys from `Object` schema
     * @param keys `keyof` object schema
     */
    public pick<Key extends keyof Input & keyof Output>(
        ...keys: Key[]
    ): ObjectSchema<Name, Pick<Input, Key>, Pick<Output, Key>> {
        const pickedSchema: Pick<Input, Key> = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (keys.includes(key as Key)) {
                newSchema[key] = value
            }
            return newSchema
        }, {}) as Pick<Input, Key>

        return new ObjectSchema<Name, Pick<Input, Key>, Pick<Output, Key>>(
            this.name,
            pickedSchema
        )
    }

    /**
     * @description omit keys from `Object` schema
     * @param keys `keyof` object schema
     */
    public omit<Key extends keyof Input & keyof Output>(
        ...keys: Key[]
    ): ObjectSchema<Name, Omit<Input, Key>, Omit<Output, Key>> {
        const omittedSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (!keys.includes(key as Key)) {
                newSchema[key] = value
            }
            return newSchema
        }, {}) as Omit<Input, Key>

        return new ObjectSchema<Name, Omit<Input, Key>, Omit<Output, Key>>(
            this.name,
            omittedSchema
        )
    }

    /**
     * @description partial `Object` schema
     */
    public partial(): ObjectSchema<Name, ToPartial<Input>> {
        const partialSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (this.isOptionalActiveInstance(value)) {
                newSchema[key] = value.optional()
            }
            return newSchema
        }, {}) as ToPartial<Input>

        return new ObjectSchema<Name, ToPartial<Input>>(
            `${this.name} | UNDEFINED` as Name,
            partialSchema
        )
    }

    /**
     * @description deep partial `Object` schema
     */
    public deepPartial(): ObjectSchema<Name, ToDeepPartial<Input>> {
        const partialSchema = Object.entries(
            this._objectShape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            if (value instanceof ObjectSchema) {
                const optionalDeepPartialSchema = value.deepPartial().optional()
                optionalDeepPartialSchema.shouldFilterKeys =
                    value.shouldFilterKeys

                newSchema[key] = optionalDeepPartialSchema
                return newSchema
            }
            if (this.isOptionalActiveInstance(value)) {
                newSchema[key] = value.optional()
                return newSchema
            }
            return newSchema
        }, {}) as ToDeepPartial<Input>

        return new ObjectSchema<Name, ToDeepPartial<Input>>(
            this.name,
            partialSchema
        )
    }

    /**
     * @description extend `Object` schema
     * @param extendSchema extend target `Object` schema
     */
    public extend<ExtendInput extends ObjectSchemaType>(
        extendSchema: ExtendInput
    ): ObjectSchema<
        Name,
        Input & InferSchemaInputOutput<ExtendInput>[0],
        Output & InferSchemaInputOutput<ExtendInput>[1]
    > {
        const extendedSchema: Input & ExtendInput = Object.entries(
            extendSchema.shape
        ).reduce<ObjectSchemaRecord>((newSchema, [key, value]) => {
            newSchema[key] = value as SchemaShape
            return newSchema
        }, this.shape) as Input & ExtendInput

        return new ObjectSchema<
            Name,
            Input & ExtendInput,
            Output & ExtendInput
        >(this.name, extendedSchema)
    }

    private _isOptional: boolean = false
    private get isOptional(): boolean {
        return this._isOptional
    }
    public optional(): ObjectSchema<
        "OBJECT | UNDEFINED",
        Input,
        Output | undefined
    > {
        return this.createOptional((validator) => {
            const optional = new ObjectSchema<
                "OBJECT | UNDEFINED",
                Input,
                Output | undefined
            >("OBJECT | UNDEFINED", this._objectShape, validator)

            optional._isOptional = true
            optional.shouldFilterKeys = this.shouldFilterKeys
            return optional
        })
    }

    private _isNullable: boolean = false
    private get isNullable(): boolean {
        return this._isNullable
    }
    public nullable(): ObjectSchema<"OBJECT | NULL", Input, Output | null> {
        return this.createNullable((validator) => {
            const nullable = new ObjectSchema<
                "OBJECT | NULL",
                Input,
                Output | null
            >("OBJECT | NULL", this._objectShape, validator)

            nullable._isNullable = true
            nullable.shouldFilterKeys = this.shouldFilterKeys
            return nullable
        })
    }

    public nullish(): ObjectSchema<
        "OBJECT | NULL | UNDEFINED",
        Input,
        Output | null | undefined
    > {
        return this.createNullish((validator) => {
            const nullish = new ObjectSchema<
                "OBJECT | NULL | UNDEFINED",
                Input,
                Output | null | undefined
            >("OBJECT | NULL | UNDEFINED", this._objectShape, validator)

            nullish._isNullable = true
            nullish._isOptional = true
            nullish.shouldFilterKeys = this.shouldFilterKeys
            return nullish
        })
    }
}

export type ObjectSchemaShape = ObjectSchema<"OBJECT", any>
