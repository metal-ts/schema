import { describe, expect, it } from 'vitest'
import { t } from '../index'
import { label } from './utils/test.label'

describe(label.unit('MetalType - PrimitivesSchema'), () => {
    it(label.case('should parse string -> strict'), () => {
        const parsed = t.string.parse('hello')
        const stringArray = t.string.array.parse(['hello', 'world'])

        expect(parsed).toEqual('hello')
        expect(stringArray).toEqual(['hello', 'world'])
    })

    it(label.case('should parse number -> strict'), () => {
        const parsed = t.number.parse(1)
        const numberArray = t.number.array.parse([1, 2, 3])

        expect(parsed).toEqual(1)
        expect(numberArray).toEqual([1, 2, 3])
    })

    it(label.case('should parse boolean -> strict'), () => {
        const parsed = t.boolean.parse(true)
        const booleanArray = t.boolean.array.parse([true, false])

        expect(parsed).toEqual(true)
        expect(booleanArray).toEqual([true, false])
    })

    it(label.case('should parse symbol -> strict'), () => {
        const testSymbol = Symbol('hello')
        const parsed = t.symbol.parse(testSymbol)
        const symbolArray = t.symbol.array.parse([testSymbol])

        expect(parsed).toEqual(testSymbol)
        expect(symbolArray).toEqual([testSymbol])
    })

    it(label.case('should parse undefined -> strict'), () => {
        const parsed = t.undefined.parse(undefined)
        const undefinedArray = t.undefined.array.parse([undefined, undefined])

        expect(parsed).toEqual(undefined)
        expect(undefinedArray).toEqual([undefined, undefined])
    })

    it(label.case('should parse null -> strict'), () => {
        const parsed = t.null.parse(null)
        const nullArray = t.null.array.parse([null, null])

        expect(parsed).toEqual(null)
        expect(nullArray).toEqual([null, null])
    })

    it(label.case('should parse any -> strict'), () => {
        const parsed = t.any.parse('hello')
        const parsed2 = t.any.parse(1)
        const parsed3 = t.any.parse(true)
        const anyArray = t.any.array.parse(['hello', 1, true])

        expect(parsed).toEqual('hello')
        expect(parsed2).toEqual(1)
        expect(parsed3).toEqual(true)
        expect(anyArray).toEqual(['hello', 1, true])
    })

    it(label.case('should parse unknown -> strict'), () => {
        const parsed = t.unknown.parse('hello')
        const unknownArray = t.unknown.array.parse(['hello', 1, true])

        expect(parsed).toEqual('hello')
        expect(unknownArray).toEqual(['hello', 1, true])
    })

    it(label.case('should parse literal -> strict'), () => {
        const parsed = t.literal('hello').parse('hello')
        expect(parsed).toEqual('hello')

        const parsed2 = t.literal(1).parse(1)
        expect(parsed2).toEqual(1)

        const parsed3 = t.literal(true).parse(true)
        expect(parsed3).toEqual(true)

        const literalArray = t
            .literal('hello')
            .array.optional()
            .parse(['hello'])
        expect(literalArray).toEqual(['hello'])
    })

    it(label.case('should parse never -> strict'), () => {
        expect(() => t.never.parse('hello')).toThrowError('')
    })

    it(label.case('should parse nullish -> strict'), () => {
        const nullishString = t.string.nullish()
        const parsed = nullishString.parse('hello')
        const parsed2 = nullishString.parse(null)

        expect(parsed).toEqual('hello')
        expect(parsed2).toEqual(null)
    })

    it(label.case('should parse nullable -> strict'), () => {
        const nullableString = t.string.nullable()
        const parsed = nullableString.parse('hello')
        const parsed2 = nullableString.parse(null)

        expect(parsed).toEqual('hello')
        expect(parsed2).toEqual(null)
    })

    it(label.case('should parse optional -> strict'), () => {
        const optionalString = t.string.optional()
        const optionalNumber = t.number.optional()

        const parsed = optionalString.parse('hello')
        const parsed2 = optionalString.parse(undefined)
        const parsed3 = optionalNumber.parse(1)
        const parsed4 = optionalNumber.parse(undefined)

        expect(parsed).toEqual('hello')
        expect(parsed2).toEqual(undefined)
        expect(parsed3).toEqual(1)
        expect(parsed4).toEqual(undefined)
    })
})
