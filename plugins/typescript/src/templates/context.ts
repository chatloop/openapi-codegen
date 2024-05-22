import { pascal } from "case";

export const getContext = (prefix: string, componentsFile: string) =>
  `import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
  import { QueryOperation, UseInfiniteQueryOptions } from './${componentsFile}';
  
  export type ${pascal(prefix)}Context = {
    fetcherOptions: {
      /**
       * Headers to inject in the fetcher
       */
      headers?: {};
      /**
       * Query params to inject in the fetcher
       */
      queryParams?: {};
    };
    queryOptions: {
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

  /**
   * Context injected into every react-query hook wrappers
   * 
   * @param _queryOptions options from the useQuery wrapper
   */
   export function use${pascal(prefix)}QueryContext<
     TQueryFnData = unknown,
     TError = unknown,
     TData = TQueryFnData,
     TQueryKey extends QueryKey = QueryKey
   >(
     _queryOptions?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
   ): ${pascal(prefix)}Context {
      return {
        fetcherOptions: {},
        queryOptions: {},
        queryKeyFn
    }
  }
  
  export function useInfiniteQueryContext<
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
    _queryOptions?: UseInfiniteQueryOptions<TQueryFnData, TError, TData>
  ): ${pascal(prefix)}InfiniteContext<number, TQueryFnData> {
    const initialPageParam = operation.variables.queryParams &&
    operation.variables.queryParams['page'] ? operation.variables.queryParams['page'] : 1
    return {
      fetcherOptions: {},
      queryOptions: {},
      queryKeyFn,
      initialPageParam,
      getNextPageParam: (lastPage, allPages) => {
        return lastPage ? initialPageParam + allPages.length : undefined
      },
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
