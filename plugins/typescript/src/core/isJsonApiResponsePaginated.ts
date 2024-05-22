import {
  isReferenceObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  ResponseObject,
} from "openapi3-ts/oas31";
import { getReferenceSchema } from "./getReferenceSchema";

/**
 * Extract the json api resource type from success responses (2xx)
 */
export const isJsonApiOperationPaginated = (
  operation: OperationObject,
  openApiDocument: OpenAPIObject,
) => {
  if (operation.responses === undefined || operation.parameters === undefined) {
    return false;
  }
  let hasJsonApiResponse = false;
  for (const [statusCode, response] of Object.entries(operation.responses)) {
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

    hasJsonApiResponse = true;
    break;
  }

  if (!hasJsonApiResponse) {
    return false;
  }

  const parameters = operation.parameters
    .map((parameter) => {
      return isReferenceObject(parameter)
        ? (getReferenceSchema(
            parameter.$ref,
            openApiDocument,
          ) as ParameterObject)
        : parameter;
    })
    .filter(
      (parameter) =>
        parameter.in === "query" && parameter.name.startsWith("page["),
    );
  return parameters.length > 0;
};
