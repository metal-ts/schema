1. Global function run time optimization 가능함, by Function prototype

-   https://shlrur.github.io/javascripts/javascript-engine-fundamentals-optimizing-prototypes/
-   https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Function
-   https://stackoverflow.com/questions/1573593/whats-the-fastest-way-to-iterate-over-an-objects-properties-in-javascript

2. And schema type check is necessary?

```ts
class Schema {
    public and<SchemaInstance extends SchemaShape>(
        schema: SchemaInstance
    ): Schema<
        Name,
        InferSchemaInputOutput<SchemaInstance>[0] & InputType,
        InferSchemaInputOutput<SchemaInstance>[1] & OutputType
    > {
        const andValidator: ValidationUnit<unknown> = (target, error) => {
            const isAnd =
                this.internalValidator(target, this.$errorStack) &&
                schema.internalValidator(target, this.$errorStack)

            if (!isAnd) {
                error.push({
                    error_type: "intersection_error",
                    message: MetalError.formatTypeError(
                        `${this.type} & ${schema.type}`,
                        target
                    ),
                })
            }
            return isAnd
        }
        return this.validate(andValidator)
    }
}
```

3. recursive schema

```ts
import { MetalError } from "../error"
import { Infer } from "../metal-type"
import { Schema, SchemaShape, ValidationUnit } from "./schema"

type RecursiveGenerator<ThisArgs, ThisType> = {
    [key in keyof ThisType & keyof ThisArgs]: ThisType &
        RecursiveGenerator<ThisArgs, ThisType>
}

export class Recursive<
    ThisArgs extends SchemaShape,
    ThisSchema extends SchemaShape,
> extends Schema<
    "RECURSIVE",
    RecursiveGenerator<Infer<ThisArgs>, Infer<ThisSchema>>
> {
    public constructor(
        base: ThisArgs,
        thisT: (base: ThisArgs) => ThisSchema,
        extraValidator?: ValidationUnit<unknown>
    ) {
        const thisSchema: ThisSchema = thisT(base)
        const recursiveValidator: ValidationUnit<unknown> = (target, e) => {
            if (typeof target !== "object" || target === null) {
                e.push({
                    error_type: "recursive_error",
                    message: MetalError.formatTypeError(
                        this.type,
                        target,
                        "Recursive must be an object"
                    ),
                })
                return false
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const isCorrectRecursive = (recursiveTarget: unknown): boolean =>
                true

            const recursiveValidationResult: boolean =
                !isCorrectRecursive(target) ||
                (extraValidator?.(target, e) ?? false)

            return recursiveValidationResult
        }
        super("RECURSIVE", recursiveValidator)
    }
}

export const recursive =
    <ThisArgs extends SchemaShape>(base: ThisArgs) =>
    <ThisSchema extends SchemaShape>(
        thisT: (base: ThisArgs) => ThisSchema,
        extraValidator?: ValidationUnit<unknown>
    ): Recursive<ThisArgs, ThisSchema> =>
        new Recursive(base, thisT, extraValidator)
```
