import { Schema } from '.'

export class Recursive<In, Out> extends Schema<'Recursive', In, Out> {
    constructor() {
        super('Recursive', () => {
            return true
        })
    }
}
