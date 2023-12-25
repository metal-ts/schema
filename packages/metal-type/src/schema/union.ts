/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, WITH_NAME_NOTATION } from "../interface"
import { logSchema } from "../utils"
import {
    type AbstractSchema,
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"

export class UnionSchema<
        Name extends WITH_NAME_NOTATION<"UNION">,
        const Input extends readonly SchemaShape[],
        const Output = Input[number],
    >
    extends Schema<Name, Input, Output>
    implements AbstractSchema
{
    constructor(
        name: Name,
        private readonly _unionShape: Input,
        extraValidator?: ValidationUnit<unknown>
    ) {
        const unionValidator: ValidationUnit<unknown> = (target, e) => {
            // const tempShape = this.shape
            const matchedUnionLocation = this._unionShape.findIndex((schema) =>
                schema.is(target)
            )
            this.parseSelectedSchema = matchedUnionLocation
            const isValidUnion = matchedUnionLocation !== -1
            if (!isValidUnion) {
                e.push({
                    error_type: "union_error",
                    message: MetalError.formatTypeError(
                        logSchema(this.schemaDetail),
                        target,
                        `Union must be one of ${logSchema(this.schemaDetail)}`
                    ),
                })
            }

            if (isValidUnion) return true
            return extraValidator?.(target, e) ?? false
        }
        super(name, unionValidator)
        this.injectErrorStack(this.$errorStack)
    }
    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this._unionShape.forEach((schema) => {
            schema.injectErrorStack(errorStack)
            super.injectErrorStack(errorStack)
        })
    }

    private parseSelectedSchema: number = -1
    public override parse(target: unknown): Infer<Schema<Name, Input, Output>> {
        if (this.internalValidator(target, this.$errorStack)) {
            const parsed =
                this._unionShape[this.parseSelectedSchema]!.parse(target)
            this.parseSelectedSchema = -1
            return parsed
        }

        this.parseSelectedSchema = -1
        throw new MetalError({
            code: "VALIDATION",
            expectedType: this.name,
            manager: this.$errorStack,
        })
    }

    public override get schemaDetail(): SchemaInformation<
        Name,
        Array<SchemaInformation<string, unknown>>
    > {
        return {
            type: this.name,
            shape: this._unionShape.map((schema) => schema.schemaDetail),
        }
    }

    /**
     * @description Get the union shape
     */
    public get shape(): Input {
        return this._unionShape.map((schema) =>
            schema.clone()
        ) as unknown as Input
    }

    public optional = (): UnionSchema<Name, Input, Input[number] | undefined> =>
        this.createOptional(
            (optionalValidator) =>
                new UnionSchema<Name, Input, Input[number] | undefined>(
                    `${this.name} | UNDEFINED` as Name,
                    this._unionShape,
                    optionalValidator
                )
        )

    public nullable = (): UnionSchema<Name, Input, Input[number] | null> =>
        this.createNullable(
            (nullableValidator) =>
                new UnionSchema<Name, Input, Input[number] | null>(
                    `${this.name} | NULL` as Name,
                    this._unionShape,
                    nullableValidator
                )
        )

    public nullish = (): UnionSchema<
        Name,
        Input,
        Input[number] | null | undefined
    > =>
        this.createNullish(
            (nullishValidator) =>
                new UnionSchema<Name, Input, Input[number] | null | undefined>(
                    `${this.name} | NULL | UNDEFINED` as Name,
                    this._unionShape,
                    nullishValidator
                )
        )
}
