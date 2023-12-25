import type { TOTAL_TYPE_UNIT_NAMES } from "../interface"
import { ArraySchema } from "./array"
import { ObjectSchema } from "./object"
import { PrimitiveSchema } from "./primitives"
import { TupleSchema } from "./tuple"
import { UnionSchema } from "./union"
import * as schema from "."

class MetalType {
    private static instance: MetalType
    private constructor() {}
    public static create(): MetalType {
        return (this.instance ??= new MetalType())
    }
    public get string(): PrimitiveSchema<"STRING", string, string> {
        return schema.string()
    }
    public get number(): PrimitiveSchema<"NUMBER", number, number> {
        return schema.number()
    }
    public get boolean(): PrimitiveSchema<"BOOLEAN", boolean, boolean> {
        return schema.boolean()
    }
    public get null(): PrimitiveSchema<"NULL", null, null> {
        return schema.null()
    }
    public get undefined(): PrimitiveSchema<"UNDEFINED", undefined, undefined> {
        return schema.undefined()
    }
    public get symbol(): PrimitiveSchema<"SYMBOL", symbol, symbol> {
        return schema.symbol()
    }
    public get any(): PrimitiveSchema<"ANY", unknown, unknown> {
        return schema.any()
    }
    public get unknown(): PrimitiveSchema<"UNKNOWN", unknown, unknown> {
        return schema.unknown()
    }
    public get never(): PrimitiveSchema<"NEVER", never, never> {
        return schema.never()
    }
    public literal = <const Literal extends string | number | boolean>(
        literal: Literal
    ): PrimitiveSchema<`LITERAL<${Literal}>`, Literal, Literal> =>
        schema.literal(literal)

    public object = <ObjectShape extends schema.ObjectSchemaRecord>(
        objectShape: ObjectShape
    ): ObjectSchema<"OBJECT", ObjectShape, ObjectShape> =>
        new ObjectSchema<"OBJECT", ObjectShape, ObjectShape>(
            "OBJECT",
            objectShape
        )

    public array = <ArrayShape extends schema.SchemaShape>(
        arrayShape: ArrayShape
    ): ArraySchema<"ARRAY", ArrayShape, ArrayShape> =>
        new ArraySchema<"ARRAY", ArrayShape, ArrayShape>("ARRAY", arrayShape)

    public tuple = <const TupleShape extends readonly schema.SchemaShape[]>(
        tupleShape: TupleShape
    ): TupleSchema<"TUPLE", TupleShape, TupleShape> =>
        new TupleSchema<"TUPLE", TupleShape, TupleShape>("TUPLE", tupleShape)

    public union = <const UnionShape extends readonly schema.SchemaShape[]>(
        ...unionShape: UnionShape
    ): UnionSchema<"UNION", UnionShape, UnionShape[number]> =>
        new UnionSchema<"UNION", UnionShape, UnionShape[number]>(
            "UNION",
            unionShape
        )
    /**
     * @description Create custom schema with input and output type
     * @param name name of the schema
     * @param internalValidator validation unit of the schema
     * @param label label of the schema
     * @param transformer transformer of the schema
     */
    public custom = <Name extends TOTAL_TYPE_UNIT_NAMES, Input, Output = Input>(
        name: Name,
        internalValidator: schema.ValidationUnit<unknown>,
        label?: string | undefined,
        transformer?: schema.Transformer<Input, Output> | undefined
    ): schema.Schema<Name, Input, Output> =>
        new schema.Schema<Name, Input, Output>(
            name,
            internalValidator,
            label,
            transformer
        )
}

export const t = MetalType.create()
