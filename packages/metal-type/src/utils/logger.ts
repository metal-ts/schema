import type { SchemaInformation } from "../schema/schema"

const formatTypeSchema = (
    schema: SchemaInformation<string, unknown>
): string => {
    const pureSchemaType = schema.type.split(" ")[0]
    switch (pureSchemaType) {
        case "TUPLE": {
            return `readonly [${(
                schema.shape as Array<SchemaInformation<string, unknown>>
            )
                .map(formatTypeSchema)
                .join(", ")}]`
        }

        case "UNION":
            return (schema.shape as Array<SchemaInformation<string, unknown>>)
                .map(formatTypeSchema)
                .join(" | ")

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
            return `{${objectShape.join(", ")}}`
        }

        case "ARRAY":
            return `Array<${formatTypeSchema(
                schema.shape as SchemaInformation<string, unknown>
            )}>`

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

const formatString = (inputString: string, tab: number = TAB_NUMBER) => {
    const TAB = " ".repeat(tab)
    let result = ""
    let indentLevel = 0

    for (let index = 0; index < inputString.length; index++) {
        const char = inputString[index]

        if (char === "{" || char === "[") {
            result += char + "\n" + ""
            indentLevel++
            result += TAB.repeat(indentLevel) + " "
        } else if (char === "}" || char === "]") {
            result += "\n"
            indentLevel--
            result += TAB.repeat(indentLevel)
            const addedChar = indentLevel === 0 ? char : ` ${char}`
            result += addedChar
            if (inputString[index + 1] === ",") {
                result += ","
                index++
                result += "\n" + TAB.repeat(indentLevel)
            }
        } else if (char === ",") {
            result += ",\n"
            result += TAB.repeat(indentLevel)
        } else {
            result += char
        }
    }

    result = result.trim()

    return result
}

const enter = (target: string): string => `\n${target}\n`

export const prettyPrint = (
    target: unknown,
    tab: number = TAB_NUMBER
): string => enter(JSON.stringify(target, null, tab))

export const logSchema = (
    schemaInformation: SchemaInformation<string, unknown>,
    tab: number = TAB_NUMBER
): string => enter(formatString(formatTypeSchema(schemaInformation), tab))
