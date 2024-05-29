import { OpenAPIObject, PathItemObject } from "openapi3-ts/oas31";
import { isOperationObject } from "./isOperationObject";
import { isVerb } from "./isVerb";
import { isJsonApiOperationPaginated } from "./isJsonApiOperationPaginated";

export const determineComponentForOperations = (
  openAPIDocument: OpenAPIObject,
) => {
  const operationIds: string[] = [];

  openAPIDocument.paths &&
    Object.entries(openAPIDocument.paths).forEach(
      ([route, verbs]: [string, PathItemObject]) => {
        Object.entries(verbs).forEach(([verb, operation]) => {
          if (!isVerb(verb) || !isOperationObject(operation)) return;
          const operationId = operation.operationId;

          if (operationIds.includes(operationId)) {
            throw new Error(
              `The operationId "${operation.operationId}" is duplicated in your schema definition!`,
            );
          }
          operationIds.push(operationId);
          const isPaginated = isJsonApiOperationPaginated(
            operation,
            openAPIDocument,
          );

          const component: "useQuery" | "useMutation" | "useInfiniteQuery" =
            operation["x-openapi-codegen-component"] ||
            (verb === "get"
              ? isPaginated
                ? "useInfiniteQuery"
                : "useQuery"
              : "useMutation");

          if (
            !["useQuery", "useMutation", "useInfiniteQuery"].includes(component)
          ) {
            throw new Error(`[x-openapi-codegen-component] Invalid value for ${operation.operationId} operation
          Valid options: "useMutation", "useQuery", "useInfiniteQuery"`);
          }

          if (component === "useInfiniteQuery" && !isPaginated) {
            throw new Error(
              `[x-openapi-codegen-component] Invalid value for ${operation.operationId} operation, the does not appear to be paginated, its missing pagination query parameters`,
            );
          }

          operation["x-openapi-codegen-component"] = component;
        });
      },
    );

  return openAPIDocument;
};
