/* eslint-disable @typescript-eslint/no-explicit-any */
import { type MetalCause, MetalError } from "../error"
import { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, SchemaNames, WITH_MARK } from "../interface"
import { prettyPrint } from "../utils"

/**
 * @description Schema logging information
 */
export type SchemaInformation<Name extends string, Shape = unknown> = {
    /**
     * @description Schema type name
     */
    type: Name
    /**
     * @description Schema shape
     */
    shape: Shape
}

export type ValidationUnit<ValidationTarget> = (
    target: ValidationTarget,
    errorManager: SchemaErrorStack
) => boolean
/**
 * @description Create validation unit
 * @example
 * ```ts
 * // 1. Define custom validation unit
 * const max = (max: number) => validator((target, error) => {
 *      const isMaxOverflowed = target.length <= max
 *      if(!isMaxOverflowed) {
 *          error.push({
 *              error_type: "string_max_overflow_error",
 *              message: `string size must be less than ${max}`,
 *          })
 *      }
 *      return isMaxOverflowed
 * })
 * // 2. Use custom validation unit
 * const Person = object({
 *     name: string().validate(max(10)),
 *     // name must be less than 10
 * })
 * ```
 * @returns `true` if validation is passed, `false` if validation is failed
 */
export const validator = <Input>(
    func: ValidationUnit<Input>
): ValidationUnit<Input> => func

type HardTransformer<Input extends SchemaShape, Output extends SchemaShape> = (
    target: Input
) => Output

export type Transformer<Input, Output> = Output extends SchemaShape
    ? never
    : (target: Input, errorStack: SchemaErrorStack) => Output
/**
 * @description Create transformation unit
 * @example
 * ```ts
 * // 1. Define custom transformation unit
 * const toCamelCase = transformer((target: string, error) => {
 *      const camelCased = target.replace(/([-_][a-z])/gi, ($1) =>
 *          $1.toUpperCase().replace("-", "").replace("_", "")
 *      )
 *      return camelCased
 * })
 *
 * // 2. Use custom transformation unit
 * const Person = object({
 *    name: string().transform(toCamelCase),
 *   // name will be camelCased
 * })
 * ```
 */
export const transformer = <Input, Output>(
    func: Transformer<Input, Output>
): Transformer<Input, Output> => func

/**
 * @description Schema core
 */
export class Schema<Name extends SchemaNames, Input, Output = Input> {
    public constructor(
        private readonly _name: Name,
        protected readonly internalValidator: ValidationUnit<unknown>,
        private _label?: string,
        private readonly transformer?: Transformer<Input, Output>
    ) {
        this.$errorStack = new SchemaErrorStack()
    }

    /**
     * @description Schema type name
     */
    public get name(): Name {
        return this._name
    }
    /**
     * @description Schema label
     */
    public get label(): string {
        return this._label ?? this._name
    }
    /**
     * @description Schema type name in lowercase
     */
    public get type(): Lowercase<Name> {
        return this._name.toLowerCase() as Lowercase<Name>
    }
    public get shape(): unknown {
        return this.type
    }

    public get nameDetail(): WITH_MARK<Name> {
        if (this.isOptional && this.isNullable)
            return `${this.name} | NULL | UNDEFINED`
        if (this.isOptional && !this.isNullable)
            return `${this.name} | UNDEFINED`
        if (!this.isOptional && this.isNullable) return `${this.name} | NULL`
        return this.name
    }

    /**
     * @description Schema detail information for debugging
     */
    public get schemaDetail(): SchemaInformation<WITH_MARK<Name>> {
        return {
            type: this.nameDetail,
            shape: this.type,
        }
    }

    public isOptional: boolean = false
    public optional(): Schema<Name, Input, Output | undefined> {
        const schema = new Schema<Name, Input, Output | undefined>(
            this._name,
            this.internalValidator,
            this._label,
            this.transformer
        )
        this.setSchemaType(schema, "optional")
        return schema
    }
    protected setSchemaType<Schema extends SchemaShape>(
        target: Schema,
        type: "optional" | "nullish" | "nullable"
    ): void {
        switch (type) {
            case "optional":
                target.isOptional = true
                break
            case "nullable":
                target.isNullable = true
                break
            case "nullish":
                target.isNullable = true
                target.isOptional = true
                break
        }
        target.injectErrorStack(this.$errorStack)
    }

    public isNullable: boolean = false
    public nullable(): Schema<Name, Input, Output | null> {
        const schema = new Schema<Name, Input, Output | null>(
            this._name,
            this.internalValidator,
            this._label,
            this.transformer
        )
        this.setSchemaType(schema, "nullable")
        return schema
    }
    public nullish(): Schema<Name, Input, Output | null | undefined> {
        const schema = new Schema<Name, Input, Output | null | undefined>(
            this._name,
            this.internalValidator,
            this._label,
            this.transformer
        )
        this.setSchemaType(schema, "nullish")
        return schema
    }

    protected $errorStack: SchemaErrorStack

    /**
     * @description Inject external error manager
     * @example
     * ```ts
     * const Coord = object({
     *    x: number(),
     *    y: number(),
     *    nested: object({
     *        x: number(),
     *        y: number(),
     *    })
     * })
     * ```
     * then, nested object's error manager will be injected by parent error manager.
     */
    public injectErrorStack(
        externalErrorStack: SchemaErrorStack,
        targetShape?: SchemaShape
    ) {
        if (targetShape) {
            targetShape.$errorStack = externalErrorStack
        } else {
            this.$errorStack = externalErrorStack
        }
    }

    private readonly validationPipes: Array<
        ValidationUnit<Infer<Schema<Name, Input, Output>>>
    > = []
    private get shouldPerformCustomValidation(): boolean {
        return this.validationPipes.length > 0
    }

    private passValidationPipes(
        target: Infer<Schema<Name, Input, Output>>
    ): void {
        const isPassingPipe: boolean = this.validationPipes
            .map((pipe) => pipe(target, this.$errorStack))
            .every(Boolean)

        if (!isPassingPipe) {
            const pipeError = new MetalError({
                code: "VALIDATION",
                expectedType: this._name,
                stack: this.$errorStack,
            })
            throw pipeError
        }
    }

    private checkParseMode(target: unknown): boolean {
        if (this.isOptional && target === undefined) return true
        if (this.isNullable && target === null) return true
        if (
            this.isNullable &&
            this.isOptional &&
            (target === null || target === undefined)
        )
            return true

        return false
    }

    private performValidate(
        target: unknown
    ): Infer<Schema<Name, Input, Output>> {
        if (this.checkParseMode(target)) {
            return target as Infer<Schema<Name, Input, Output>>
        }

        if (!this.internalValidator(target, this.$errorStack)) {
            throw new MetalError({
                code: "VALIDATION",
                expectedType: this._name,
                stack: this.$errorStack,
            })
        }

        if (this.shouldPerformCustomValidation) {
            this.passValidationPipes(
                target as Infer<Schema<Name, Input, Output>>
            )
        }

        return target as Infer<Schema<Name, Input, Output>>
    }

    /**
     * @description Add transformer
     * @param transformer {@link transformer}
     */
    public transform<NewOutput>(
        transformer: Transformer<Infer<Schema<Name, Input, Output>>, NewOutput>
    ): Schema<Name, Output, NewOutput> {
        const transformed = new Schema<Name, Output, NewOutput>(
            this._name,
            this.internalValidator,
            this._label,
            transformer as Transformer<Output, NewOutput>
        )
        transformed.isOptional = this.isOptional
        transformed.isNullable = this.isNullable
        transformed.injectErrorStack(this.$errorStack)
        return transformed
    }

    /**
     * @description Transform original schema to another schema
     * @param schemaTransformer transformation function with original schema
     */
    public transformHard<TransformSchema extends SchemaShape>(
        schemaTransformer: HardTransformer<
            Schema<Name, Input, Output>,
            TransformSchema
        >
    ): TransformSchema {
        return schemaTransformer(this.clone())
    }

    private processTransformation(
        input: Infer<Schema<Name, Input, Output>>
    ): Infer<Schema<Name, Input, Output>> {
        if (!this.transformer) {
            return input
        }

        try {
            const transformerSchema = (
                this.transformer as Transformer<
                    Infer<Schema<Name, Input, Output>>,
                    Output
                >
            )(input, this.$errorStack)

            if (transformerSchema instanceof Schema) {
                return transformerSchema.parse(input)
            }

            return transformerSchema as Infer<Schema<Name, Input, Output>>
        } catch (e) {
            if (e instanceof MetalError) throw e

            throw new MetalError({
                code: "TRANSFORMATION",
                expectedType: this._name,
                stack: this.$errorStack,
            })
        }
    }

    /**
     * @description Clone schema
     */
    public clone(): Schema<Name, Input, Output> {
        const cloned = new Schema<Name, Input, Output>(
            this._name,
            this.internalValidator,
            this._label,
            this.transformer
        )
        cloned.isOptional = this.isOptional
        cloned.isNullable = this.isNullable
        return cloned
    }

    /**
     * @description Add validation units
     * @param validatorUnits {@link validator}
     */
    public validate(
        ...validatorUnits: Array<
            ValidationUnit<Infer<Schema<Name, Input, Output>>>
        >
    ): Schema<Name, Input, Output> {
        const cloned: Schema<Name, Input, Output> = this.clone()
        cloned.validationPipes.push(...validatorUnits)
        return cloned
    }

    /**
     * @description Parse unknown data
     * @param target unknown parse target
     */
    public parse(target: unknown): Infer<Schema<Name, Input, Output>> {
        const validated: Infer<Schema<Name, Input, Output>> =
            this.performValidate(target)
        return this.processTransformation(validated)
    }

    /**
     * @description Parse unknown data safely, without throwing error
     * @param target unknown parse target
     * @param fallbackValue default value
     */
    public safeParse(
        target: unknown,
        fallbackValue: Infer<Schema<Name, Input, Output>>
    ):
        | {
              success: true
              value: Infer<Schema<Name, Input, Output>>
          }
        | {
              success: false
              value: Infer<Schema<Name, Input, Output>>
              error: string
              cause: Array<MetalCause>
          } {
        try {
            const parsed = this.parse(target)
            return {
                success: true,
                value: parsed,
            }
        } catch (e) {
            if (e instanceof MetalError)
                return {
                    success: false,
                    value: fallbackValue as Infer<Schema<Name, Input, Output>>,
                    error: e.message,
                    cause: e.cause,
                }

            return {
                success: false,
                value: fallbackValue as Infer<Schema<Name, Input, Output>>,
                error: `Metal-type unknown error occurred.\n${prettyPrint(e)}`,
                cause: [
                    {
                        message: "unknown error occurred",
                        error_type: "unknown_error",
                        error_info: e,
                    },
                ],
            }
        }
    }

    /**
     * @description Narrowing type guard
     */
    public is(input: unknown): input is Infer<Schema<Name, Input, Output>> {
        try {
            this.parse(input)
            return true
        } catch (e) {
            return false
        }
    }

    /**
     * @description Assert type guard
     */
    public assert(
        input: unknown
    ): asserts input is Infer<Schema<Name, Input, Output>> {
        if (this.is(input)) return

        this.$errorStack.push({
            error_type: "assertion_error",
            message: MetalError.formatTypeError(this._name, input),
        })
        throw new MetalError({
            code: "VALIDATION",
            expectedType: this._name,
            stack: this.$errorStack,
        })
    }
}

/**
 * @description Metal type schema instance
 */
export type SchemaShape = Schema<string, any, any>
/**
 * @description Extract schema I/O type
 */
export type InferSchemaInputOutput<T extends SchemaShape> = T extends Schema<
    string,
    infer Input,
    infer Output
>
    ? [Input, Output]
    : never
