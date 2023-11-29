export const prettyPrint = (obj: unknown): string =>
    JSON.stringify(obj, null, 2)
