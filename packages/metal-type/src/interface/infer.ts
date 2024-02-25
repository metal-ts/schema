/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Schema } from '../schema'
import type { PRIMITIVE_SCHEMA_NAMES } from './schema.names'
import type { Prettify } from './util'

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

export type GetOptionalObject<T> = GetRequiredField<T> & GetOptionalField<T>

/**
 * @description Get type of schema
 */
export type Infer<T> =
    T extends Schema<infer Name, any, infer Output>
        ? Name extends PRIMITIVE_SCHEMA_NAMES
            ? Output
            : Name extends 'ARRAY'
              ? Output extends Array<infer ArrayElement>
                  ? Array<Infer<ArrayElement>>
                  : Infer<Output>
              : Name extends 'TUPLE'
                ? Output extends readonly [infer First, ...infer Rest]
                    ? readonly [Infer<First>, ...Infer<Rest>]
                    : Infer<Output>
                : Name extends 'OBJECT'
                  ? Prettify<
                        GetOptionalObject<{
                            [Key in keyof Output]: Infer<Output[Key]>
                        }>
                    >
                  : Infer<Output>
        : T extends readonly [infer First, ...infer Rest]
          ? readonly [Infer<First>, ...Infer<Rest>]
          : T
