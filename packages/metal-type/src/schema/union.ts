/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetalError } from "../error"
import type { SchemaErrorStack } from "../error/schema.error.stack"
import type { Infer, WITH_MARK } from "../interface"
import { logSchema } from "../utils"
import {
    Schema,
    type SchemaInformation,
    type SchemaShape,
    type ValidationUnit,
} from "./schema"

export class UnionSchema<
    const Input extends SchemaShape[],
    const Output = Input[number],
> extends Schema<"UNION", Input, Output> {
    constructor(private readonly _unionShape: Input) {
        const unionValidator: ValidationUnit<unknown> = (target, e) => {
            const matchedUnionLocation = this._unionShape.findIndex(
                (schema) => {
                    const res = schema.is(target)
                    this.$errorStack.reset()
                    return res
                }
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

            return isValidUnion
        }
        super("UNION", unionValidator)
        this.injectErrorStack(this.$errorStack)
    }
    public override injectErrorStack(errorStack: SchemaErrorStack): void {
        this._unionShape.forEach((schema) => {
            schema.injectErrorStack(errorStack)
            super.injectErrorStack(errorStack)
        })
    }

    private parseSelectedSchema: number = -1
    public override parse(
        target: unknown
    ): Infer<Schema<"UNION", Input, Output>> {
        if (this.checkParseMode(target)) return target as Infer<Output>

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
            stack: this.$errorStack,
        })
    }

    public override get schemaDetail(): SchemaInformation<
        WITH_MARK<"UNION">,
        Array<SchemaInformation<string, unknown>>
    > {
        return {
            type: this.nameDetail,
            shape: this._unionShape.map((schema) => schema.schemaDetail),
        }
    }

    /**
     * @description Get the union shape
     */
    public override get shape(): Input {
        return this._unionShape.map((schema) =>
            schema.clone()
        ) as unknown as Input
    }

    public override clone(): UnionSchema<Input, Output> {
        return new UnionSchema(this._unionShape)
    }

    public override optional(): UnionSchema<Input, Output | undefined> {
        const optionalUnion = new UnionSchema<Input, Output | undefined>(
            this._unionShape
        )
        this.setSchemaType(optionalUnion, "optional")
        return optionalUnion
    }

    public override nullable(): UnionSchema<Input, Output | null> {
        const nullableUnion = new UnionSchema<Input, Output | null>(
            this._unionShape
        )
        this.setSchemaType(nullableUnion, "nullable")
        return nullableUnion
    }

    public override nullish(): UnionSchema<Input, Output | null | undefined> {
        const nullishUnion = new UnionSchema<Input, Output | null | undefined>(
            this._unionShape
        )
        this.setSchemaType(nullishUnion, "nullish")
        return nullishUnion
    }
}
