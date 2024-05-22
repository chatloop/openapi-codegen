import { cloneDeep, set } from "lodash";
import { OpenAPIObject, PathItemObject } from "openapi3-ts/oas31";

import { isOperationObject } from "../core/isOperationObject";
import { isVerb } from "../core/isVerb";

export const forceReactQueryComponent = <
  OperationIdMatcher extends string | RegExp,
>({
  openAPIDocument,
  operationIdMatcher,
  component,
}: {
  /**
   * The openAPI document to transform
   */
  openAPIDocument: OpenAPIObject;
  /**
   * OperationId to force
   */
  operationIdMatcher: OperationIdMatcher;
  /**
   * Component to use
   */
  component: "useMutate" | "useQuery" | "useInfiniteQuery";
}) => {
  let extensionPaths: string[] = [];

  // Find the component
  openAPIDocument.paths &&
    Object.entries(openAPIDocument.paths).forEach(
      ([route, verbs]: [string, PathItemObject]) => {
        Object.entries(verbs).forEach(([verb, operation]) => {
          if (!isVerb(verb) || !isOperationObject(operation)) return;
          if (
            operationIdMatcher instanceof RegExp
              ? operationIdMatcher.test(operation.operationId)
              : operation.operationId === operationIdMatcher
          ) {
            extensionPaths.push(
              `paths.${route}.${verb}.x-openapi-codegen-component`,
            );
          }
        });
      },
    );

  if (extensionPaths.length === 0) {
    if (typeof operationIdMatcher === "string") {
      throw new Error(
        `[forceReactQueryComponent] Operation with the operationId "${operationIdMatcher}" not found`,
      );
    }
    return openAPIDocument;
  }

  const newDoc = cloneDeep(openAPIDocument);
  extensionPaths.map((extensionPath) => set(newDoc, extensionPath, component));
  return newDoc;
};
