// eslint-disable-next-line @typescript-eslint/ban-types
type SupportStringWithLiteral = string & {}

type JAVASCRIPT_PRIMITIVES_TYPE_NAMES =
    | "STRING"
    | "BOOLEAN"
    | "NUMBER"
    | "BIGINT"
    | "SYMBOL"
    | "UNDEFINED"
    | "NULL"
    | "DATE"
type TYPESCRIPT_PRIMITIVES_TYPE_NAMES =
    | `LITERAL<${string | number | boolean}>`
    | "ANY"
    | "NEVER"
    | "UNKNOWN"

type JAVASCRIPT_EXTENDED_TYPE_NAMES = "OBJECT" | "ARRAY" | "MAP" | "SET"
type TYPESCRIPT_EXTENDED_TYPE_NAMES = "TUPLE" | "UNION"

type WITH_NULLABLE_MARK<T extends string> = `${T} | NULL | UNDEFINED`
type WITH_OPTIONAL_MARK<T extends string> = `${T} | UNDEFINED`
type WITH_NULL_MARK<T extends string> = `${T} | NULL`
export type WITH_MARK<T extends string> =
    | WITH_NULLABLE_MARK<T>
    | WITH_OPTIONAL_MARK<T>
    | WITH_NULL_MARK<T>
    | T

/**
 * @description Get total type name of schema
 */
export type SchemaNames =
    | SupportStringWithLiteral
    | PRIMITIVE_SCHEMA_NAMES
    | EXTENDED_SCHEMA_NAMES

/**
 * @description Get primitive type name of schema
 */
export type PRIMITIVE_SCHEMA_NAMES =
    | JAVASCRIPT_PRIMITIVES_TYPE_NAMES
    | TYPESCRIPT_PRIMITIVES_TYPE_NAMES

/**
 * @description Get extended type name of schema
 */
export type EXTENDED_SCHEMA_NAMES =
    | JAVASCRIPT_EXTENDED_TYPE_NAMES
    | TYPESCRIPT_EXTENDED_TYPE_NAMES
