import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { jsonApiOperationHasQueryParam } from "./jsonApiOperationHasQueryParam";

/**
 * Determine if an operation has a json api response and supports includes
 * i.e. it has query parameter `include`
 */
export const jsonApiOperationHasIncludes = (
  operation: OperationObject,
  openApiDocument: OpenAPIObject,
) => jsonApiOperationHasQueryParam("include", operation, openApiDocument);
