export type RemoveOptionalMark<T extends string> = T extends `${infer U}?`
    ? U
    : T

export type Prettify<T> = {
    [K in keyof T]: T[K]
    // eslint-disable-next-line @typescript-eslint/ban-types
} & {}

export type GetArguments<T> = T extends (...args: infer U) => unknown
    ? U
    : never
