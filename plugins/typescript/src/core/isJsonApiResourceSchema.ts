import {
  isReferenceObject,
  OpenAPIObject,
  ReferenceObject,
  SchemaObject,
  SchemaObjectType,
} from "openapi3-ts/oas31";
import { getReferenceSchema } from "./getReferenceSchema";

export type JsonApiResourceSchema = SchemaObject & {
  type: "object";
  properties: {
    id: {
      type: "string";
    };
    type: {
      type: "string";
      const?: string;
      enum?: string[];
    };
    attributes?: Record<string, any>;
  };
};
export const isJsonApiResourceSchema = (
  schema: SchemaObject,
  openAPIDocument: OpenAPIObject,
): false | JsonApiResourceSchema => {
  // Resource objects must be objects with the following properties: id, type
  // and either attributes, relationships or links
  // if they only have id and type, or id, type and meta they could be resource identifier objects
  if (
    schema.type === undefined ||
    schema.type !== "object" ||
    schema.properties === undefined ||
    schema.properties["id"] === undefined ||
    schema.properties["type"] === undefined ||
    (schema.properties["attributes"] === undefined &&
      schema.properties["relationships"] === undefined &&
      schema.properties["links"] === undefined)
  ) {
    return false;
  }
  const id = isReferenceObject(schema.properties["id"])
    ? getReferenceSchema(schema.properties["id"].$ref, openAPIDocument)
    : schema.properties["id"];
  if (id.type === undefined || id.type !== "string") {
    return false;
  }
  const type = isReferenceObject(schema.properties["type"])
    ? getReferenceSchema(schema.properties["type"].$ref, openAPIDocument)
    : schema.properties["type"];
  if (type.type === undefined || type.type !== "string") {
    return false;
  }

  let attributes: {
    type?: SchemaObjectType | SchemaObjectType[] | undefined;
    properties?:
      | { [propertyName: string]: SchemaObject | ReferenceObject }
      | undefined;
  } = {
    type: "object" as const,
    properties: {},
  };

  if (schema.properties["attributes"] !== undefined) {
    attributes = isReferenceObject(schema.properties["attributes"])
      ? getReferenceSchema(
          schema.properties["attributes"].$ref,
          openAPIDocument,
        )
      : schema.properties["attributes"];
  }

  return attributes.type !== undefined && attributes.type === "object"
    ? ({
        ...schema,
        properties: { id, type, attributes },
      } as JsonApiResourceSchema)
    : false;
};
