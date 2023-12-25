/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Schema, SchemaShape } from "../schema"
import type { PRIMITIVES_UNIT_NAMES, WITH_TRANSFORM_MARK } from "./type"

/**
 * @description get optional field from record
 * @example
 * ```ts
 * const Test = {
 *    a: "string",
 *    "b?": "number",
 *    "c?": "boolean",
 * }
 * type TestOptionalField = OptionalField<typeof Test>
 * type TestOptionalField = {
 *    b?: number;
 *    c?: boolean;
 * }
 * ```
 */
type GetOptionalField<Record> = {
    [RecordKey in keyof Record as RecordKey extends `${infer OptionalKey}?`
        ? OptionalKey
        : never]?: RecordKey extends `${string}?` ? Record[RecordKey] : never
}
/**
 * @description get required field from record
 * @example
 * ```ts
 * const Test = {
 *    a: "string",
 *    "b?": "number",
 *    "c?": "boolean",
 * }
 * type TestRequiredField = RequiredField<typeof Test>
 * type TestRequiredField = {
 *    a: string;
 * }
 * ```
 */
type GetRequiredField<Record> = {
    [RecordKey in keyof Record as RecordKey extends `${string}?`
        ? never
        : RecordKey]: Record[RecordKey]
}
type GetOptionalObject<T> = GetRequiredField<T> & GetOptionalField<T>

type InferArray<T> = T extends Array<infer U> ? Array<U> : never
/**
 * @description Get type of schema
 */
export type Infer<T> = T extends Schema<infer Name, any, infer OutputType>
    ? Name extends "OBJECT"
        ? OutputType extends SchemaShape
            ? never
            : Infer<OutputType>
        : Name extends PRIMITIVES_UNIT_NAMES
          ? OutputType
          : Name extends "ARRAY"
            ? OutputType extends SchemaShape
                ? never
                : InferArray<Infer<OutputType>>
            : Name extends WITH_TRANSFORM_MARK<string>
              ? OutputType
              : Infer<OutputType>
    : T extends readonly [infer U, ...infer Rest]
      ? Rest extends never[]
          ? readonly [Infer<U>]
          : readonly [Infer<U>, ...Infer<Rest>]
      : T extends Record<string, any>
        ? Prettify<
              GetOptionalObject<{
                  [Key in keyof T]: Infer<T[Key]>
              }>
          >
        : T

type Prettify<T> = {
    [K in keyof T]: T[K]
    // eslint-disable-next-line @typescript-eslint/ban-types
} & {}
