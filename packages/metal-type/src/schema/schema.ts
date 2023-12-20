/* eslint-disable @typescript-eslint/no-explicit-any */
import { type MetalCause, MetalError } from "../error"
import { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, TOTAL_TYPE_UNIT_NAMES } from "../interface"
import { prettyPrint } from "../utils"

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
type Transformer<Input, Output> = Output extends SchemaShape
    ? never
    : (target: Infer<Input>, errorStack: SchemaErrorStack) => Output
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

export abstract class TypescriptFeatures {
    /**
     * @description optional, `OutputType | undefined`
     */
    public abstract optional(): unknown
    /**
     * @description nullable, `OutputType | null`
     */
    public abstract nullable(): unknown
    /**
     * @description nullish, `OutputType | null | undefined`
     */
    public abstract nullish(): unknown
}

/**
 * @description Schema core
 */
export class Schema<Name extends TOTAL_TYPE_UNIT_NAMES, Input, Output = Input> {
    public constructor(
        private readonly _name: Name,
        protected readonly internalValidator: ValidationUnit<unknown>,
        private readonly _label?: string,
        protected readonly transformer?: Transformer<Input, Output>
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
    /**
     * @description Schema default value
     */
    public defaultValue?: Infer<Input> | null = null

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
    public injectErrorStack(externalErrorStack: SchemaErrorStack) {
        this.$errorStack = externalErrorStack
    }

    private readonly validationPipes: Array<ValidationUnit<Infer<Input>>> = []
    private get shouldPerformCustomValidation(): boolean {
        return this.validationPipes.length > 0
    }

    private passValidationPipes(target: Infer<Input>): void {
        const isPassingPipe: boolean = this.validationPipes
            .map((pipe) => pipe(target, this.$errorStack))
            .every(Boolean)

        if (!isPassingPipe) {
            const pipeError = new MetalError({
                code: "VALIDATION",
                expectedType: this._name,
                manager: this.$errorStack,
            })
            throw pipeError
        }
    }

    private performValidate(target: unknown): Infer<Input> {
        if (!this.internalValidator(target, this.$errorStack)) {
            throw new MetalError({
                code: "VALIDATION",
                expectedType: this._name,
                manager: this.$errorStack,
            })
        }

        if (this.shouldPerformCustomValidation)
            this.passValidationPipes(target as Infer<Input>)

        return target as Infer<Input>
    }

    protected createOptional<SchemaInstance extends SchemaShape>(
        getSchema: (validator: ValidationUnit<unknown>) => SchemaInstance
    ): SchemaInstance {
        const withOptionalValidator: ValidationUnit<unknown> = (
            target,
            error
        ) => {
            const isOptional =
                this.internalValidator(target, this.$errorStack) ||
                target === undefined

            if (!isOptional) {
                error.push({
                    error_type: "expected undefined",
                    message: MetalError.formatTypeError(
                        `${this._name} | undefined`,
                        target
                    ),
                })
            }
            return isOptional
        }
        return getSchema(withOptionalValidator)
    }

    protected createNullable<SchemaInstance extends SchemaShape>(
        getSchema: (validator: ValidationUnit<unknown>) => SchemaInstance
    ): SchemaInstance {
        const withNullableValidator: ValidationUnit<unknown> = (
            target,
            error
        ) => {
            const isNullable =
                this.internalValidator(target, this.$errorStack) ||
                target === null

            if (!isNullable) {
                error.push({
                    error_type: "expected null",
                    message: MetalError.formatTypeError(
                        `${this.type} | null`,
                        target
                    ),
                })
            }
            return isNullable
        }
        return getSchema(withNullableValidator)
    }

    protected createNullish<SchemaInstance extends SchemaShape>(
        getSchema: (validator: ValidationUnit<unknown>) => SchemaInstance
    ): SchemaInstance {
        const withNullishValidator: ValidationUnit<unknown> = (
            target,
            error
        ) => {
            const isNullish =
                this.internalValidator(target, this.$errorStack) ||
                target === null ||
                target === undefined

            if (!isNullish) {
                error.push({
                    error_type: "expected null | undefined",
                    message: MetalError.formatTypeError(
                        `${this.type} | null | undefined`,
                        target
                    ),
                })
            }
            return isNullish
        }

        return getSchema(withNullishValidator)
    }

    /**
     * @description Add transformer
     * @param transformer transformer function
     */
    public transform<NewOutput>(
        transformer: Transformer<Output, NewOutput>
    ): Schema<`${Name} - TRANSFORMED`, Output, NewOutput> {
        return new Schema(
            `${this._name} - TRANSFORMED` as `${Name} - TRANSFORMED`,
            this.internalValidator,
            this._label,
            transformer
        )
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

    private processTransformation(input: Infer<Input>): Infer<Output> {
        if (!this.transformer) return input as Infer<Output>

        try {
            const transformerSchema = this.transformer(input, this.$errorStack)

            if (transformerSchema instanceof Schema)
                return transformerSchema.parse(input)

            return transformerSchema as Infer<Output>
        } catch (e) {
            if (e instanceof MetalError) {
                throw e
            }
            throw new MetalError({
                code: "TRANSFORMATION",
                expectedType: this._name,
                manager: this.$errorStack,
            })
        }
    }

    /**
     * @description Clone schema
     */
    public clone(): Schema<Name, Input, Output> {
        this.$errorStack.reset()

        return new Schema(
            this._name,
            this.internalValidator,
            this._label,
            this.transformer
        )
    }

    /**
     * @description Add validation unit
     * @param validatorUnits validation units
     */
    public validate(
        ...validatorUnits: Array<ValidationUnit<Infer<Input>>>
    ): Schema<Name, Input, Output> {
        const cloned = this.clone()
        cloned.validationPipes.push(...validatorUnits)
        return cloned
    }

    /**
     * @description parse
     * @param target unknown parse target
     * @returns validated - transformed target
     */
    public parse(target: unknown): Infer<Output> {
        const validated: Infer<Input> = this.performValidate(target)
        return this.processTransformation(validated)
    }

    /**
     * @description safe parse
     * @param target unknown parse target
     * @param defaultValue default value
     * @returns do not throw error, return error object
     */
    public safeParse(
        target: unknown,
        defaultValue: Infer<Input>
    ):
        | {
              success: true
              value: Infer<Output>
          }
        | {
              success: false
              value: Infer<Output>
              error: string
              cause: Array<MetalCause>
          } {
        this.default(defaultValue)

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
                    value: defaultValue as Infer<Output>,
                    error: e.message,
                    cause: e.cause,
                }

            return {
                success: false,
                value: defaultValue as Infer<Output>,
                error: `Metal unknown error occurred.\n${prettyPrint(e)}`,
                cause: [
                    {
                        message: "unknown error occurred",
                        error_type: "unknown",
                        error_info: e,
                    },
                ],
            }
        }
    }

    /**
     * @description Narrowing type guard
     */
    public is(input: unknown): input is Infer<Input> {
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
    public assert(input: unknown): asserts input is Infer<Input> {
        if (this.is(input)) return

        this.$errorStack.push({
            error_type: "assertion_error",
            message: MetalError.formatTypeError(this._name, input),
        })
        throw new MetalError({
            code: "VALIDATION",
            expectedType: this._name,
            manager: this.$errorStack,
        })
    }

    /**
     * @description Set default value
     */
    public default(defaultValue: Infer<Input>) {
        this.defaultValue = defaultValue
        return this
    }

    /**
     * @description Schema detail information for debugging
     */
    public get schemaDetail(): unknown {
        return this.type
    }
}

/**
 * @description it might be a schema
 */
export type SchemaShape = Schema<string, any, any>
export type InferSchemaInputOutput<T extends SchemaShape> = T extends Schema<
    string,
    infer Input,
    infer Output
>
    ? [Input, Output]
    : never
