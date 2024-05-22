import {
  isReferenceObject,
  OpenAPIObject,
  SchemaObject,
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
    attributes: Record<string, any>;
  };
};
export const isJsonApiResourceSchema = (
  schema: SchemaObject,
  openAPIDocument: OpenAPIObject,
): false | JsonApiResourceSchema => {
  if (
    schema.type === undefined ||
    schema.type !== "object" ||
    schema.properties === undefined ||
    schema.properties["id"] === undefined ||
    schema.properties["type"] === undefined ||
    schema.properties["attributes"] === undefined
  ) {
    return false;
  }
  let id = isReferenceObject(schema.properties["id"])
    ? getReferenceSchema(schema.properties["id"].$ref, openAPIDocument)
    : schema.properties["id"];
  if (id.type === undefined || id.type !== "string") {
    return false;
  }
  let type = isReferenceObject(schema.properties["type"])
    ? getReferenceSchema(schema.properties["type"].$ref, openAPIDocument)
    : schema.properties["type"];
  if (type.type === undefined || type.type !== "string") {
    return false;
  }
  let attributes = isReferenceObject(schema.properties["attributes"])
    ? getReferenceSchema(schema.properties["attributes"].$ref, openAPIDocument)
    : schema.properties["attributes"];

  return attributes.type !== undefined && attributes.type === "object"
    ? ({
        ...schema,
        properties: { id, type, attributes },
      } as JsonApiResourceSchema)
    : false;
};
