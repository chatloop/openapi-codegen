import {
  isReferenceObject,
  OpenAPIObject,
  ReferenceObject,
  RequestBodyObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { getReferenceSchema } from "./getReferenceSchema";

export type JsonApiRequestResource = {
  resourceType: string;
  isArray: boolean;
};

/**
 * Extract the json api resource type from the request body
 */
export const getJsonApiRequestResource = (
  requestBody: ReferenceObject | RequestBodyObject | undefined,
  openApiDocument: OpenAPIObject,
): JsonApiRequestResource | undefined => {
  if (requestBody === undefined) {
    return undefined;
  }
  if (isReferenceObject(requestBody)) {
    requestBody = getReferenceSchema(
      requestBody.$ref,
      openApiDocument,
    ) as RequestBodyObject;
  }
  if (!requestBody.content) {
    return undefined;
  }
  const jsonApiContent = Object.keys(requestBody.content).find((contentType) =>
    contentType.startsWith("application/vnd.api+json"),
  );
  if (!jsonApiContent) {
    return undefined;
  }

  let requestBodyContentSchema = requestBody.content[jsonApiContent].schema;
  if (!requestBodyContentSchema) {
    return undefined;
  }

  if (isReferenceObject(requestBodyContentSchema)) {
    requestBodyContentSchema = getReferenceSchema(
      requestBodyContentSchema.$ref,
      openApiDocument,
    );
  }

  return getJsonApiResourceType(requestBodyContentSchema, openApiDocument);
};

const getJsonApiResourceType = (
  schema: SchemaObject,
  openApiDocument: OpenAPIObject,
): JsonApiRequestResource | undefined => {
  if (
    schema.properties === undefined ||
    schema.properties["data"] === undefined
  )
    return undefined;

  let isArray = false;

  let dataSchema = isReferenceObject(schema.properties["data"])
    ? getReferenceSchema(schema.properties["data"].$ref, openApiDocument)
    : schema.properties["data"];

  if (dataSchema.type === "array" && dataSchema.items !== undefined) {
    dataSchema = isReferenceObject(dataSchema.items)
      ? getReferenceSchema(dataSchema.items.$ref, openApiDocument)
      : dataSchema.items;
    isArray = true;
  }
  if (
    dataSchema.properties === undefined ||
    dataSchema.properties["type"] === undefined
  )
    return undefined;

  const type = isReferenceObject(dataSchema.properties["type"])
    ? getReferenceSchema(dataSchema.properties["type"].$ref, openApiDocument)
    : dataSchema.properties["type"];
  if (type.type === undefined || type.type !== "string") {
    return undefined;
  }

  const resourceType = (type.enum && type.enum[0]) || type.const;

  return resourceType ? { resourceType, isArray } : undefined;
};
