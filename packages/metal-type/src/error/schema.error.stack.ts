import type { CustomCause } from "./metal.error"

export class SchemaErrorStack {
    private _errorStack: Array<CustomCause> = []
    public get stack(): Array<CustomCause> {
        return this._errorStack
    }
    public reset(): void {
        this._errorStack = []
    }
    /**
     * @description add custom error cause to stack
     * @param error custom error cause
     */
    public push(error: CustomCause): void {
        this._errorStack.push(error)
    }
    /**
     * @description remove last error cause from stack
     */
    public pop(): void {
        this._errorStack.pop()
    }
    public get messages(): string {
        const messageLength = this._errorStack.length
        const stackMessages: string = this._errorStack.reduceRight<string>(
            (acc, cause, number) => {
                const currStackMessage = `${acc ? `${acc}\n` : ""}[ error${
                    messageLength - number
                }: ${cause.error_type} ]: ${cause.message}`
                return currStackMessage
            },
            ""
        )
        return stackMessages
    }
}
