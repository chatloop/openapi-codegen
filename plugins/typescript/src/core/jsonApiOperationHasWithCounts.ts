import { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";
import { jsonApiOperationHasQueryParam } from "./jsonApiOperationHasQueryParam";

/**
 * Determine if an operation has a json api response and supports withCount's
 * i.e. it has query parameter `withCount`
 */
export const jsonApiOperationHasWithCounts = (
  operation: OperationObject,
  openApiDocument: OpenAPIObject,
) => jsonApiOperationHasQueryParam("withCount", operation, openApiDocument);
