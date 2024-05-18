import { OperationObject } from "openapi3-ts/oas31";

/**
 * Type guard for `OperationObject`
 *
 * @param obj
 */
export const isOperationObject = (
  obj: any,
): obj is OperationObject & {
  operationId: string;
  "x-openapi-codegen-component"?: "useQuery" | "useMutate" | "useInfiniteQuery";
} => typeof obj === "object" && typeof (obj as any).operationId === "string";
