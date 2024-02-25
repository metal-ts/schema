import type { SchemaNames } from '../interface'
import { ArraySchema } from './array'
import { ObjectSchema } from './object'
import { PrimitiveSchema } from './primitives'
import { TupleSchema } from './tuple'
import { UnionSchema } from './union'
import * as schema from '.'

class MetalType {
    private static instance: MetalType
    private constructor() {}
    public static create(): MetalType {
        return (this.instance ??= new MetalType())
    }
    public get string(): PrimitiveSchema<'STRING', string, string> {
        return schema.string()
    }
    public get number(): PrimitiveSchema<'NUMBER', number, number> {
        return schema.number()
    }
    public get boolean(): PrimitiveSchema<'BOOLEAN', boolean, boolean> {
        return schema.boolean()
    }
    public get null(): PrimitiveSchema<'NULL', null, null> {
        return schema.null()
    }
    public get undefined(): PrimitiveSchema<'UNDEFINED', undefined, undefined> {
        return schema.undefined()
    }
    public get symbol(): PrimitiveSchema<'SYMBOL', symbol, symbol> {
        return schema.symbol()
    }
    public get any(): PrimitiveSchema<'ANY', unknown, unknown> {
        return schema.any()
    }
    public get unknown(): PrimitiveSchema<'UNKNOWN', unknown, unknown> {
        return schema.unknown()
    }
    public get never(): PrimitiveSchema<'NEVER', never, never> {
        return schema.never()
    }
    public get date(): PrimitiveSchema<'DATE', Date, Date> {
        return schema.date()
    }
    public get bigint(): PrimitiveSchema<'BIGINT', bigint, bigint> {
        return schema.bigint()
    }
    public literal = <const Literal extends string | number | boolean>(
        literal: Literal
    ): PrimitiveSchema<`LITERAL<${Literal}>`, Literal, Literal> =>
        schema.literal(literal)

    public object = <ObjectShape extends schema.ObjectSchemaRecord>(
        objectShape: ObjectShape
    ): ObjectSchema<ObjectShape, ObjectShape> =>
        new ObjectSchema<ObjectShape, ObjectShape>(objectShape)

    public array = <ArrayShape extends schema.SchemaShape>(
        arrayShape: ArrayShape
    ): ArraySchema<ArrayShape, ArrayShape> =>
        new ArraySchema<ArrayShape, ArrayShape>(arrayShape)

    public tuple = <const TupleShape extends readonly schema.SchemaShape[]>(
        tupleShape: TupleShape
    ): TupleSchema<TupleShape, TupleShape> =>
        new TupleSchema<TupleShape, TupleShape>(tupleShape)

    public union = <const UnionShape extends schema.SchemaShape[]>(
        ...unionShape: UnionShape
    ): UnionSchema<UnionShape, UnionShape[number]> =>
        new UnionSchema<UnionShape, UnionShape[number]>(unionShape)

    public custom = <Name extends SchemaNames, Input, Output = Input>(
        name: Name,
        validator: schema.ValidationUnit<unknown>
    ): schema.Schema<Name, Input, Output> =>
        new schema.Schema<Name, Input, Output>(name, validator)
}

export const t = MetalType.create()
