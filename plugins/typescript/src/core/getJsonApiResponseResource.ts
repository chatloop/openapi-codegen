import {
  isReferenceObject,
  OpenAPIObject,
  ReferenceObject,
  ResponseObject,
  ResponsesObject,
  SchemaObject,
} from "openapi3-ts/oas31";
import { getReferenceSchema } from "./getReferenceSchema";
import { isJsonApiResourceSchema } from "./isJsonApiResourceSchema";

export type JsonApiResponseResource = {
  resourceType: string;
  isArray: boolean;
};

/**
 * Extract the json api resource type from success responses (2xx)
 */
export const getJsonApiResponseResource = (
  responses: ResponsesObject | undefined,
  openApiDocument: OpenAPIObject,
): JsonApiResponseResource | undefined => {
  if (responses === undefined) {
    return undefined;
  }

  let resourceType: JsonApiResponseResource | undefined = undefined;

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!statusCode.startsWith("2")) continue;

    let responseSchema: ResponseObject | ReferenceObject = response;
    if (isReferenceObject(responseSchema)) {
      responseSchema = getReferenceSchema(
        response.$ref,
        openApiDocument,
      ) as ResponseObject;
    }

    if (!responseSchema.content) continue;
    const jsonApiContent = Object.keys(responseSchema.content).find(
      (contentType) => contentType.startsWith("application/vnd.api+json"),
    );
    if (!jsonApiContent) continue;

    let responseContentSchema = response.content[jsonApiContent].schema;
    if (!responseContentSchema) continue;

    if (isReferenceObject(responseContentSchema)) {
      responseContentSchema = getReferenceSchema(
        responseContentSchema.$ref,
        openApiDocument,
      );
    }

    const type = getJsonApiResourceType(responseContentSchema, openApiDocument);
    if (type) {
      resourceType = type;
      break;
    }
  }
  return resourceType;
};

const getJsonApiResourceType = (
  schema: SchemaObject,
  openApiDocument: OpenAPIObject,
): JsonApiResponseResource | undefined => {
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
  const resourceSchema = isJsonApiResourceSchema(dataSchema, openApiDocument);
  if (!resourceSchema) return undefined;

  const resourceType =
    (resourceSchema.properties.type.enum &&
      resourceSchema.properties.type.enum[0]) ||
    resourceSchema.properties.type.const;

  return resourceType ? { resourceType, isArray } : undefined;
};
