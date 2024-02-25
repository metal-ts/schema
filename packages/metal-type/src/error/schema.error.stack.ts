import type { CustomCause } from './metal.error'

export class SchemaErrorStack {
    private _errorStack: Array<CustomCause> = []
    /**
     * @description Get current error stack
     */
    public get stack(): Array<CustomCause> {
        return this._errorStack
    }
    /**
     * @description Reset error stack
     */
    public reset(): void {
        this._errorStack = []
    }
    /**
     * @description Add custom error cause to stack
     * @param error Custom error cause
     */
    public push(error: CustomCause): void {
        this._errorStack.push(error)
    }
    /**
     * @description Remove last error cause from stack
     */
    public pop(): void {
        this._errorStack.pop()
    }
    /**
     * @description Get the schema error messages
     */
    public get messages(): string {
        const messageLength = this._errorStack.length
        const stackMessages: string = this._errorStack.reduceRight<string>(
            (acc, cause, number) => {
                const currStackMessage = `${acc ? `${acc}\n` : ''}[Err_${
                    messageLength - number
                }] ${cause.error_type} ${cause.message}`
                return currStackMessage
            },
            ''
        )
        return stackMessages
    }
}
