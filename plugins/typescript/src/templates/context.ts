import { pascal } from "case";

export const getContext = (prefix: string, componentsFile: string) =>
  `import type { QueryClient, QueryKey } from "@tanstack/react-query";
  import {
    QueryOperation,
    MutationOperation,
    UseQueryOptions,
    UseInfiniteQueryOptions,
    UseMutationOptions
  } from './${componentsFile}';
  
  export type ${pascal(prefix)}Context = {
    fetcherOptions?: {
      /**
       * Headers to inject in the fetcher
       */
      headers?: {};
      /**
       * Query params to inject in the fetcher
       */
      queryParams?: {};
    };
    queryOptions?: {
      /**
       * Set this to \`false\` to disable automatic refetching when the query mounts or changes query keys.
       * Defaults to \`true\`.
       */
      enabled?: boolean;
    };
    /**
     * Query key manager.
     */
    queryKeyFn: (
      operation: QueryOperation,
      fetcherOptions: Context['fetcherOptions']
    ) => QueryKey
  };
  
  export type ${pascal(prefix)}InfiniteContext<PageParam = unknown, TQueryFnData = {}> = Context & {
    initialPageParam: PageParam | undefined
    getNextPageParam: (
      lastPage: TQueryFnData | undefined,
      allPages: TQueryFnData[]
    ) => PageParam | undefined
    getPreviousPageParam: (
      firstPage: TQueryFnData | undefined,
      allPages: TQueryFnData[]
    ) => PageParam | undefined
    maxPages: number| undefined
    paginateVariables: <
      TVariables extends {
        headers?: {}
        queryParams?: {}
      }
    >(
      pageParam: PageParam | undefined,
      variables: TVariables
    ) => TVariables
  }

  export type ${pascal(prefix)}MutationContext<
    TData = unknown,
    TVariables = unknown,
    TContext = unknown,
  > = {
    fetcherOptions?: {
      /**
       * Headers to inject in the fetcher
       */
      // eslint-disable-next-line @typescript-eslint/ban-types
      headers?: {}
      /**
       * Query params to inject in the fetcher
       */
      // eslint-disable-next-line @typescript-eslint/ban-types
      queryParams?: {}
    }
    onMutate?: (
      variables: TVariables
    ) => Promise<TContext | void> | TContext | void
    onSuccess?: (
      data: TData,
      variables: TVariables,
      context: TContext,
      queryClient: QueryClient
    ) => unknown
  }
  /**
   * Context injected into every react-query useQuery hook wrapper
   */
   export function use${pascal(prefix)}QueryContext<
     TQueryFnData = unknown,
     TError = unknown,
     TData = TQueryFnData,
   >(
      // @ts-expect-error operation is not used ...yet
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      operation: QueryOperation,
      // @ts-expect-error queryOptionsIn is not used ...yet
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      queryOptionsIn?: UseQueryOptions<TQueryFnData, TError, TData>
   ): ${pascal(prefix)}Context {
      return {
        queryKeyFn
    }
  }
  
  /**
   * Context injected into every react-query useInfiniteQuery hook wrapper
   */
  export function use${pascal(prefix)}InfiniteQueryContext<
    TQueryFnData,
    TError,
    TData
  >(
    operation: QueryOperation & {
      variables: {
        queryParams?: {
          'page'?: number
        }
      }
    },
    // @ts-expect-error queryOptionsIn is not used ...yet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    queryOptionsIn?: UseInfiniteQueryOptions<TQueryFnData, TError, TData>
  ): ${pascal(prefix)}InfiniteContext<number, TQueryFnData> {
    const initialPageParam = operation.variables.queryParams &&
    operation.variables.queryParams['page'] ? operation.variables.queryParams['page'] : 1
    return {
      queryKeyFn,
      initialPageParam,
      getNextPageParam: (lastPage, allPages) => {
        return lastPage ? initialPageParam + allPages.length : undefined
      },
      // @ts-expect-error firstPage and allPages are not used ...yet
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getPreviousPageParam: (firstPage, allPages) => {
          return undefined
      },
      maxPages: undefined,
      paginateVariables: (pageParam, variables) => {
        if (pageParam === undefined) {
          return variables
        }
        return {
          ...variables,
          queryParams: {
            ...variables.queryParams,
            page: pageParam
          }
        }
      }
    }
  }
  
  /**
 * Context injected into every react-query useMutation hook wrapper
 */
export function use${pascal(prefix)}MutationContext<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown,
>(
  // @ts-expect-error operation is not used ...yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  operation: MutationOperation,
  // @ts-expect-error mutationOptionsIn is not used ...yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mutationOptionsIn?: UseMutationOptions<TData, TError, TVariables, TContext>
): MutationContext<TData, TVariables, TContext> {
  return {}
}

  export const queryKeyFn = (operation: QueryOperation, fetcherOptions: Context['fetcherOptions']) => {
    const queryKey: unknown[] = hasPathParams(operation)
      ? operation.path
          .split("/")
          .filter(Boolean)
          .map((i) => resolvePathParam(i, operation.variables.pathParams))
      : operation.path.split("/").filter(Boolean);
  
    if (hasQueryParams(operation)) {
      queryKey.push(operation.variables.queryParams);
    }
  
    if (hasBody(operation)) {
      queryKey.push(operation.variables.body);
    }
  
    queryKey.push(fetcherOptions)

    return queryKey;
  }
  // Helpers
  const resolvePathParam = (
    key: string,
    pathParams: Record<string, string>
  ) => {
    if (key.startsWith("{") && key.endsWith("}")) {
      return pathParams[key.slice(1, -1)];
    }
    return key;
  };

  const hasPathParams = (
    operation: QueryOperation
  ): operation is QueryOperation & {
    variables: { pathParams: Record<string, string> };
  } => {
    return Boolean((operation.variables as any).pathParams);
  };

  const hasBody = (
    operation: QueryOperation
  ): operation is QueryOperation & {
    variables: { body: Record<string, unknown> };
  } => {
    return Boolean((operation.variables as any).body);
  };

  const hasQueryParams = (
    operation: QueryOperation
  ): operation is QueryOperation & {
    variables: { queryParams: Record<string, unknown> };
  } => {
    return Boolean((operation.variables as any).queryParams);
  };
  `;
