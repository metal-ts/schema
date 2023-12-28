import type { SchemaInformation } from "../schema/schema"

const extractType = (name: string): { category: string; detail: string[] } => {
    const types = name.split("|").map((e) => e.toLowerCase().trim())
    const typeCategory = types[0]!.toUpperCase()!

    return {
        category: typeCategory,
        detail: types.slice(1),
    }
}
const formatTypeSchema = (
    schema: SchemaInformation<string, unknown>
): string => {
    const { category, detail } = extractType(schema.type)

    const detailUnion = detail.length !== 0 ? ` | ${detail.join(" | ")}` : ""
    switch (category) {
        case "TUPLE": {
            return `readonly [${(
                schema.shape as Array<SchemaInformation<string, unknown>>
            )
                .map(formatTypeSchema)
                .join(", ")}]${detailUnion}`
        }

        case "UNION":
            return `${(
                schema.shape as Array<SchemaInformation<string, unknown>>
            )
                .map(formatTypeSchema)
                .join(" | ")}${detailUnion}`

        case "OBJECT": {
            const shapes = schema.shape as Record<
                string,
                SchemaInformation<string, unknown>
            >
            const objectShape = Object.keys(shapes).map((key) => {
                const propertySchema:
                    | SchemaInformation<string, unknown>
                    | undefined = shapes[key]
                if (propertySchema === undefined)
                    throw new Error("Invalid schema")

                return `${key}: ${formatTypeSchema(propertySchema)}`
            })
            return `{${objectShape.join(", ")}}${detailUnion}`
        }

        case "ARRAY":
            return `Array<${formatTypeSchema(
                schema.shape as SchemaInformation<string, unknown>
            )}>${detailUnion}`

        // case "MAP":
        //     return `Map<${formatTypeSchema(
        //         schema.shape.key
        //     )}, ${formatTypeSchema(schema.shape.value)}>`

        // case "SET":
        //     return `Set<${formatTypeSchema(schema.shape.value)}>`
        default: {
            if (schema.type.includes("LITERAL")) {
                return `"${schema.type
                    .replace("LITERAL", "")
                    .replace("<", "")
                    .replace(">", "")}"`
            }
            return schema.type.toLowerCase()
        }
    }
}

const TAB_NUMBER = 3 as const

const formatSchemaString = (schemaString: string, tab: number = TAB_NUMBER) => {
    const TAB: string = " ".repeat(tab)
    const ENTER = "\n" as const
    const SPACE = " " as const
    const COMMA = "," as const

    let indentDepth: number = 0

    const formattedSchema: string = schemaString
        .split("")
        .reduce<string>((schema, char, i) => {
            if (char === "{" || char === "[") {
                schema += char + ENTER
                indentDepth++
                schema += TAB.repeat(indentDepth) + " "
            } else if (char === "}" || char === "]") {
                schema += ENTER
                indentDepth--
                schema += TAB.repeat(indentDepth)

                const addedChar = indentDepth === 0 ? char : SPACE + char
                schema += addedChar

                if (schemaString[i + 1] === COMMA) {
                    schema += COMMA
                    i++
                    schema += ENTER + TAB.repeat(indentDepth)
                }
            } else if (char === COMMA) {
                schema += `${COMMA}${ENTER}`
                schema += TAB.repeat(indentDepth)
            } else {
                schema += char
            }
            return schema
        }, "")

    return formattedSchema.trim()
}

const enter = (target: string, removeEnter: boolean = false): string =>
    `${removeEnter ? "" : "\n"}${target}`

type PrintOptions = {
    tab?: number
    removeEnter?: boolean
}
/**
 * @description Print object in pretty format
 */
export const prettyPrint = (
    target: unknown,
    option: PrintOptions = {
        tab: TAB_NUMBER,
        removeEnter: false,
    }
): string => enter(JSON.stringify(target, null, option.tab), option.removeEnter)
/**
 * @description Print schema in pretty format
 * @param schemaInformation {@link SchemaInformation}
 */
export const logSchema = (
    schemaInformation: SchemaInformation<string, unknown>,
    option: PrintOptions = {
        tab: TAB_NUMBER,
        removeEnter: false,
    }
): string =>
    enter(
        formatSchemaString(formatTypeSchema(schemaInformation), option.tab),
        option.removeEnter
    )
