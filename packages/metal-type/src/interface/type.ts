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
type TYPESCRIPT_EXTENDED_TYPE_NAMES = "TUPLE" | "UNION" | "INTERSECTION"

type WITH_NULLABLE_MARK<T extends string> = `${T} | NULL | UNDEFINED`
type WITH_OPTIONAL_MARK<T extends string> = `${T} | UNDEFINED`
type WITH_NULL_MARK<T extends string> = `${T} | NULL`
type WITH_MARK<T extends string> =
    | WITH_NULLABLE_MARK<T>
    | WITH_OPTIONAL_MARK<T>
    | WITH_NULL_MARK<T>

type WITH_TRANSFORM_MARK<T extends string> = `${T} - TRANSFORMED`

export type WITH_NAME_NOTATION<T extends string> =
    | WITH_MARK<T>
    | WITH_TRANSFORM_MARK<T>
    | T

export type TOTAL_TYPE_UNIT_NAMES =
    | SupportStringWithLiteral
    | PRIMITIVES_UNIT_NAMES
    | EXTENDED_UNIT_NAMES

export type PRIMITIVES_UNIT_NAMES =
    | WITH_NAME_NOTATION<JAVASCRIPT_PRIMITIVES_TYPE_NAMES>
    | WITH_NAME_NOTATION<TYPESCRIPT_PRIMITIVES_TYPE_NAMES>

export type EXTENDED_UNIT_NAMES =
    | WITH_NAME_NOTATION<JAVASCRIPT_EXTENDED_TYPE_NAMES>
    | WITH_NAME_NOTATION<TYPESCRIPT_EXTENDED_TYPE_NAMES>

export type RemoveOptionalMark<T extends string> = T extends `${infer U}?`
    ? U
    : T
export type Literalize<T> = T extends string ? T : never
