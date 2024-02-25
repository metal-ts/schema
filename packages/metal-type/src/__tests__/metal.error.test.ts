import { describe, expect, it } from 'vitest'
import { MetalError } from '../error/metal.error'
import { SchemaErrorStack } from '../error/schema.error.stack'
import { label } from './utils/test.label'

describe(label.unit('MetalError - error stack'), () => {
    const eStack = new SchemaErrorStack()

    it(label.case('should add error cause correctly'), () => {
        eStack.push({
            error_type: 'email_type_error',
            message: 'Email should be string',
        })
        expect(eStack.stack).toEqual([
            {
                error_type: 'email_type_error',
                message: 'Email should be string',
            },
        ])
    })
    it(label.case('should remove error cause correctly'), () => {
        eStack.pop()
        expect(eStack.stack).toEqual([])
    })
    it(label.case('should reset error cause correctly'), () => {
        eStack.push({
            error_type: 'email_type_error',
            message: 'Email should be string',
        })
        eStack.reset()
        expect(eStack.stack).toEqual([])
    })
    it(label.case('should show error messages backward direction'), () => {
        eStack.push({
            error_type: 'email_type_error',
            message: 'Email should be string',
        })
        eStack.push({
            error_type: 'invalid_email_error',
            message: `"not-valid-email" is not valid email format`,
        })
        expect(eStack.messages).toEqual(
            '[Err_1] invalid_email_error "not-valid-email" is not valid email format\n[Err_2] email_type_error Email should be string'
        )
    })

    it(label.case('should show error messages correctly'), () => {
        try {
            const error = new MetalError({
                code: 'VALIDATION',
                expectedType: 'string',
                stack: eStack,
            })
            throw error
        } catch (e: unknown) {
            if (e instanceof MetalError) {
                expect(e.name).toEqual('VALIDATION')
                expect(e.expectedType).toEqual('string')
                expect(e.message).toEqual(
                    '[Err_1] invalid_email_error "not-valid-email" is not valid email format\n[Err_2] email_type_error Email should be string'
                )
                expect(e.cause).toStrictEqual([
                    {
                        code: 'VALIDATION',
                        error_type: 'VALIDATION',
                        message:
                            'Validation error occurred, [Err_1] invalid_email_error "not-valid-email" is not valid email format\n[Err_2] email_type_error Email should be string',
                    },
                    {
                        error_type: 'email_type_error',
                        message: 'Email should be string',
                    },
                    {
                        error_type: 'invalid_email_error',
                        message: '"not-valid-email" is not valid email format',
                    },
                ])
            }
        }
    })
})
