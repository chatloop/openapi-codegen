import ts, { factory as f } from "typescript";
import * as c from "case";
import { get } from "lodash";

import { ConfigBase, Context } from "./types";
import { OperationObject, PathItemObject } from "openapi3-ts/oas31";

import { getUsedImports } from "../core/getUsedImports";
import { createWatermark } from "../core/createWatermark";
import { createOperationFetcherFnNodes } from "../core/createOperationFetcherFnNodes";
import { isVerb } from "../core/isVerb";
import { isOperationObject } from "../core/isOperationObject";
import { getOperationTypes } from "../core/getOperationTypes";
import { createNamedImport } from "../core/createNamedImport";

import { getFetcher } from "../templates/fetcher";
import { getContext } from "../templates/context";
import { getUtils } from "../templates/utils";
import { createNamespaceImport } from "../core/createNamespaceImport";
import { camelizedPathParams } from "../core/camelizedPathParams";

export type Config = ConfigBase & {
  /**
   * Generated files paths from `generateSchemaTypes`
   */
  schemasFiles: {
    requestBodies: string;
    schemas: string;
    parameters: string;
    responses: string;
  };
  /**
   * List of headers injected in the custom fetcher
   *
   * This will mark the header as optional in the component API
   */
  injectedHeaders?: string[];
};

export const generateReactQueryComponents = async (
  context: Context,
  config: Config,
) => {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest,
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  const printNodes = (nodes: ts.Node[]) =>
    nodes
      .map((node: ts.Node, i, nodes) => {
        return (
          printer.printNode(ts.EmitHint.Unspecified, node, sourceFile) +
          (ts.isJSDoc(node) ||
          (ts.isImportDeclaration(node) &&
            nodes[i + 1] &&
            ts.isImportDeclaration(nodes[i + 1]))
            ? ""
            : "\n")
        );
      })
      .join("\n");

  const filenamePrefix =
    c.snake(config.filenamePrefix ?? context.openAPIDocument.info.title) + "-";

  const formatFilename = config.filenameCase ? c[config.filenameCase] : c.camel;

  const filename = formatFilename(filenamePrefix + "-components");

  const fetcherFn = c.camel(`${filenamePrefix}-fetch`);
  const queryContextTypeName = `${c.pascal(filenamePrefix)}Context`;
  const infiniteQueryContextTypeName = `${c.pascal(filenamePrefix)}InfiniteContext`;

  const mutationContextHookName = `use${c.pascal(filenamePrefix)}MutationContext`;
  const queryContextHookName = `use${c.pascal(filenamePrefix)}QueryContext`;
  const infiniteQueryContextHookName = `use${c.pascal(filenamePrefix)}InfiniteQueryContext`;

  const nodes: ts.Node[] = [];
  const QueryOperations: ts.TypeLiteralNode[] = [];
  const MutationOperations: ts.TypeLiteralNode[] = [];

  const fetcherFilename = formatFilename(filenamePrefix + "-fetcher");
  const contextFilename = formatFilename(filenamePrefix + "-context");
  const utilsFilename = formatFilename(filenamePrefix + "-utils");

  if (!context.existsFile(`${fetcherFilename}.ts`)) {
    context.writeFile(
      `${fetcherFilename}.ts`,
      getFetcher({
        prefix: filenamePrefix,
        contextPath: contextFilename,
        baseUrl: get(context.openAPIDocument, "servers.0.url"),
      }),
    );
  }

  if (!context.existsFile(`${contextFilename}.ts`)) {
    context.writeFile(
      `${contextFilename}.ts`,
      getContext(filenamePrefix, filename),
    );
  }

  const operationIds: string[] = [];
  const componentsUsed: {
    useQuery: boolean;
    useInfiniteQuery: boolean;
    useMutation: boolean;
  } = {
    useQuery: false,
    useInfiniteQuery: false,
    useMutation: false,
  };

  context.openAPIDocument.paths &&
    Object.entries(context.openAPIDocument.paths).forEach(
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

          const operationFetcherFnName = `fetch${c.pascal(operationId)}`;
          const component: "useQuery" | "useMutation" | "useInfiniteQuery" =
            operation["x-openapi-codegen-component"] ||
            (verb === "get" ? "useQuery" : "useMutation");

          if (
            !["useQuery", "useMutation", "useInfiniteQuery"].includes(component)
          ) {
            throw new Error(`[x-openapi-codegen-component] Invalid value for ${operation.operationId} operation
          Valid options: "useMutation", "useQuery", "useInfiniteQuery"`);
          }
          componentsUsed[component] = true;

          const {
            dataType,
            errorType,
            requestBodyType,
            pathParamsType,
            variablesType,
            queryParamsType,
            headersType,
            declarationNodes,
          } = getOperationTypes({
            openAPIDocument: context.openAPIDocument,
            operation,
            operationId,
            printNodes,
            injectedHeaders: config.injectedHeaders,
            pathParameters: verbs.parameters,
            variablesExtraPropsType: f.createIndexedAccessTypeNode(
              f.createTypeReferenceNode(
                f.createIdentifier(
                  component === "useInfiniteQuery"
                    ? infiniteQueryContextTypeName
                    : queryContextTypeName,
                ),
                undefined,
              ),
              f.createLiteralTypeNode(f.createStringLiteral("fetcherOptions")),
            ),
          });

          nodes.push(...declarationNodes);

          const createOperarationType = (mutation: boolean = false) =>
            f.createTypeLiteralNode([
              ...(mutation
                ? [
                    f.createPropertySignature(
                      undefined,
                      f.createIdentifier("method"),
                      undefined,
                      f.createLiteralTypeNode(f.createStringLiteral(verb)),
                    ),
                  ]
                : []),
              f.createPropertySignature(
                undefined,
                f.createIdentifier("path"),
                undefined,
                f.createLiteralTypeNode(
                  f.createStringLiteral(camelizedPathParams(route)),
                ),
              ),
              f.createPropertySignature(
                undefined,
                f.createIdentifier("operationId"),
                undefined,
                f.createLiteralTypeNode(f.createStringLiteral(operationId)),
              ),
              f.createPropertySignature(
                undefined,
                f.createIdentifier("variables"),
                undefined,
                variablesType,
              ),
            ]);
          if (component === "useMutation") {
            MutationOperations.push(createOperarationType(true));
          } else {
            QueryOperations.push(createOperarationType());
          }
          let hook: ts.Node[];

          // noinspection JSUnreachableSwitchBranches <-- phpstorm is confused :S
          switch (component) {
            case "useInfiniteQuery":
              hook = createInfiniteQueryHook({
                operationFetcherFnName,
                operation,
                dataType,
                errorType,
                variablesType,
                contextHookName: infiniteQueryContextHookName,
                name: `use${c.pascal(operationId)}`,
                operationId,
                url: route,
              });
              break;
            case "useQuery":
              hook = createQueryHook({
                operationFetcherFnName,
                operation,
                dataType,
                errorType,
                variablesType,
                contextHookName: queryContextHookName,
                name: `use${c.pascal(operationId)}`,
                operationId,
                url: route,
              });
              break;
            case "useMutation":
              hook = createMutationHook({
                operationFetcherFnName,
                operation,
                dataType,
                errorType,
                variablesType,
                contextHookName: mutationContextHookName,
                name: `use${c.pascal(operationId)}`,
                operationId,
                url: route,
                verb,
              });
              break;
          }
          nodes.push(
            ...createOperationFetcherFnNodes({
              dataType,
              errorType,
              requestBodyType,
              pathParamsType,
              variablesType,
              queryParamsType,
              headersType,
              operation,
              fetcherFn,
              url: route,
              verb,
              name: operationFetcherFnName,
            }),
            ...hook,
          );
        });
      },
    );

  if (operationIds.length === 0) {
    console.log(`⚠️ You don't have any operation with "operationId" defined!`);
  }

  const operationTypeProperties = [
    f.createPropertySignature(
      undefined,
      f.createIdentifier("path"),
      undefined,
      f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ),
    f.createPropertySignature(
      undefined,
      f.createIdentifier("operationId"),
      undefined,
      f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
    ),
    f.createPropertySignature(
      undefined,
      f.createIdentifier("variables"),
      undefined,
      f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
    ),
  ];
  const queryOperationType = f.createTypeLiteralNode(operationTypeProperties);
  const QueryOperationType = f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    "QueryOperation",
    undefined,
    QueryOperations.length > 0
      ? f.createUnionTypeNode(QueryOperations)
      : queryOperationType,
  );

  const mutationOperationType = f.createTypeLiteralNode([
    f.createPropertySignature(
      undefined,
      f.createIdentifier("method"),
      undefined,
      f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ),
    ...operationTypeProperties,
  ]);

  const MutationOperationType = f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    "MutationOperation",
    undefined,
    MutationOperations.length > 0
      ? f.createUnionTypeNode(MutationOperations)
      : mutationOperationType,
  );

  const { nodes: usedImportsNodes, keys: usedImportsKeys } = getUsedImports(
    nodes,
    {
      ...config.schemasFiles,
      utils: utilsFilename,
    },
  );

  if (usedImportsKeys.includes("utils")) {
    await context.writeFile(`${utilsFilename}.ts`, getUtils());
  }

  nodes.push(
    f.createTypeAliasDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "UseQueryOptions",
      [
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TQueryFnData"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TError"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TData"),
        ),
      ],
      f.createTypeReferenceNode(f.createIdentifier("Omit"), [
        f.createTypeReferenceNode(
          f.createQualifiedName(
            f.createIdentifier("reactQuery"),
            f.createIdentifier("UseQueryOptions"),
          ),
          [
            f.createTypeReferenceNode(f.createIdentifier("TQueryFnData"), []),
            f.createTypeReferenceNode(f.createIdentifier("TError"), []),
            f.createTypeReferenceNode(f.createIdentifier("TData"), []),
          ],
        ),
        f.createUnionTypeNode([
          f.createLiteralTypeNode(f.createStringLiteral("queryKey")),
          f.createLiteralTypeNode(f.createStringLiteral("queryFn")),
        ]),
      ]),
    ),
  );

  nodes.push(
    f.createTypeAliasDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "UseInfiniteQueryOptions",
      [
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TQueryFnData"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TError"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TData"),
        ),
      ],
      f.createIntersectionTypeNode([
        f.createTypeReferenceNode(f.createIdentifier("Omit"), [
          f.createTypeReferenceNode(
            f.createQualifiedName(
              f.createIdentifier("reactQuery"),
              f.createIdentifier("UseInfiniteQueryOptions"),
            ),
            [
              f.createTypeReferenceNode(f.createIdentifier("TQueryFnData"), []),
              f.createTypeReferenceNode(f.createIdentifier("TError"), []),
              f.createTypeReferenceNode(f.createIdentifier("TData"), []),
            ],
          ),
          f.createUnionTypeNode([
            f.createLiteralTypeNode(f.createStringLiteral("queryKey")),
            f.createLiteralTypeNode(f.createStringLiteral("queryFn")),
            f.createLiteralTypeNode(f.createStringLiteral("getNextPageParam")),
            f.createLiteralTypeNode(f.createStringLiteral("initialPageParam")),
          ]),
        ]),
        f.createTypeReferenceNode(f.createIdentifier("Partial"), [
          f.createTypeReferenceNode(f.createIdentifier("Pick"), [
            f.createTypeReferenceNode(
              f.createQualifiedName(
                f.createIdentifier("reactQuery"),
                f.createIdentifier("UseInfiniteQueryOptions"),
              ),
              [
                f.createTypeReferenceNode(
                  f.createIdentifier("TQueryFnData"),
                  [],
                ),
                f.createTypeReferenceNode(f.createIdentifier("TError"), []),
                f.createTypeReferenceNode(f.createIdentifier("TData"), []),
              ],
            ),
            f.createUnionTypeNode([
              f.createLiteralTypeNode(
                f.createStringLiteral("getNextPageParam"),
              ),
              f.createLiteralTypeNode(
                f.createStringLiteral("initialPageParam"),
              ),
            ]),
          ]),
        ]),
      ]),
    ),
  );

  nodes.push(
    f.createTypeAliasDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "UseMutationOptions",
      [
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TData"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TError"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TVariables"),
        ),
        f.createTypeParameterDeclaration(
          undefined,
          f.createIdentifier("TContext"),
          undefined,
          f.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        ),
      ],
      f.createTypeReferenceNode(f.createIdentifier("Omit"), [
        f.createTypeReferenceNode(
          f.createQualifiedName(
            f.createIdentifier("reactQuery"),
            f.createIdentifier("UseMutationOptions"),
          ),
          [
            f.createTypeReferenceNode(f.createIdentifier("TData"), []),
            f.createTypeReferenceNode(f.createIdentifier("TError"), []),
            f.createTypeReferenceNode(f.createIdentifier("TVariables"), []),
            f.createTypeReferenceNode(f.createIdentifier("TContext"), []),
          ],
        ),
        f.createUnionTypeNode([
          f.createLiteralTypeNode(f.createStringLiteral("mutationFn")),
        ]),
      ]),
    ),
  );

  const componentContextImports = [
    ...(componentsUsed["useQuery"]
      ? [queryContextHookName, queryContextTypeName]
      : []),
    ...(componentsUsed["useInfiniteQuery"]
      ? [infiniteQueryContextHookName, infiniteQueryContextTypeName]
      : []),
    ...(componentsUsed["useMutation"] ? [mutationContextHookName] : []),
  ];

  const componentContextImportsNode: ts.Node[] =
    componentContextImports.length > 0
      ? [createNamedImport(componentContextImports, `./${contextFilename}`)]
      : [];

  await context.writeFile(
    filename + ".ts",
    printNodes([
      createWatermark(context.openAPIDocument.info),
      createReactQueryImport(),
      ...componentContextImportsNode,
      createNamespaceImport("Fetcher", `./${fetcherFilename}`),
      createNamedImport(fetcherFn, `./${fetcherFilename}`),
      ...usedImportsNodes,
      ...nodes,
      QueryOperationType,
      MutationOperationType,
    ]),
  );
};

const createMutationHook = ({
  operationFetcherFnName,
  contextHookName,
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  operationId,
  url,
  verb,
}: {
  operationFetcherFnName: string;
  contextHookName: string;
  name: string;
  dataType: ts.TypeNode;
  errorType: ts.TypeNode;
  variablesType: ts.TypeNode;
  operation: OperationObject;
  operationId: string;
  url: string;
  verb: "get" | "put" | "post" | "patch" | "delete";
}) => {
  const nodes: ts.Node[] = [];
  if (operation.description) {
    nodes.push(f.createJSDocComment(operation.description.trim(), []));
  }

  nodes.push(
    f.createVariableStatement(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            f.createIdentifier(name),
            undefined,
            undefined,
            f.createArrowFunction(
              undefined,
              undefined,
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode("UseMutationOptions", [
                    dataType,
                    errorType,
                    variablesType,
                  ]),
                  undefined,
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createCallExpression(
                f.createPropertyAccessExpression(
                  f.createIdentifier("reactQuery"),
                  f.createIdentifier("useMutation"),
                ),
                [dataType, errorType, variablesType],
                [
                  f.createObjectLiteralExpression(
                    [
                      f.createPropertyAssignment(
                        "mutationKey",
                        f.createArrayLiteralExpression([
                          f.createStringLiteral(operationId),
                        ]),
                      ),
                      f.createPropertyAssignment(
                        "mutationFn",
                        f.createArrowFunction(
                          undefined,
                          undefined,
                          [
                            f.createParameterDeclaration(
                              undefined,
                              undefined,
                              f.createIdentifier("variables"),
                              undefined,
                              variablesType,
                              undefined,
                            ),
                          ],
                          undefined,
                          f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                          f.createBlock([
                            f.createVariableStatement(
                              undefined,
                              f.createVariableDeclarationList(
                                [
                                  f.createVariableDeclaration(
                                    "operation",
                                    undefined,
                                    f.createTypeReferenceNode(
                                      "MutationOperation",
                                    ),
                                    f.createObjectLiteralExpression([
                                      f.createPropertyAssignment(
                                        "method",
                                        f.createStringLiteral(verb),
                                      ),
                                      f.createPropertyAssignment(
                                        "path",
                                        f.createStringLiteral(
                                          camelizedPathParams(url),
                                        ),
                                      ),
                                      f.createPropertyAssignment(
                                        "operationId",
                                        f.createStringLiteral(operationId),
                                      ),
                                      f.createShorthandPropertyAssignment(
                                        f.createIdentifier("variables"),
                                      ),
                                    ]),
                                  ),
                                  f.createVariableDeclaration(
                                    f.createObjectBindingPattern([
                                      f.createBindingElement(
                                        undefined,
                                        undefined,
                                        f.createIdentifier("fetcherOptions"),
                                        undefined,
                                      ),
                                    ]),
                                    undefined,
                                    undefined,
                                    f.createCallExpression(
                                      f.createIdentifier(contextHookName),
                                      undefined,
                                      [
                                        f.createIdentifier("operation"),
                                        f.createIdentifier("options"),
                                      ],
                                    ),
                                  ),
                                ],
                                ts.NodeFlags.Const,
                              ),
                            ),
                            f.createReturnStatement(
                              f.createCallExpression(
                                f.createIdentifier(operationFetcherFnName),
                                undefined,
                                [
                                  f.createObjectLiteralExpression(
                                    [
                                      f.createSpreadAssignment(
                                        f.createIdentifier("fetcherOptions"),
                                      ),
                                      f.createSpreadAssignment(
                                        f.createIdentifier("variables"),
                                      ),
                                    ],
                                    false,
                                  ),
                                ],
                              ),
                            ),
                          ]),
                        ),
                      ),
                      f.createSpreadAssignment(f.createIdentifier("options")),
                    ],
                    true,
                  ),
                ],
              ),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );

  return nodes;
};

const createQueryHook = ({
  operationFetcherFnName,
  contextHookName,
  dataType,
  errorType,
  variablesType,
  name,
  operationId,
  operation,
  url,
}: {
  operationFetcherFnName: string;
  contextHookName: string;
  name: string;
  operationId: string;
  url: string;
  dataType: ts.TypeNode;
  errorType: ts.TypeNode;
  variablesType: ts.TypeNode;
  operation: OperationObject;
}) => {
  const nodes: ts.Node[] = [];
  if (operation.description) {
    nodes.push(f.createJSDocComment(operation.description.trim(), []));
  }
  nodes.push(
    f.createVariableStatement(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            f.createIdentifier(name),
            undefined,
            undefined,
            f.createArrowFunction(
              undefined,
              [
                f.createTypeParameterDeclaration(
                  undefined,
                  "TData",
                  undefined,
                  dataType,
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  variablesType,
                ),
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode("UseQueryOptions", [
                    dataType,
                    errorType,
                    f.createTypeReferenceNode("TData"),
                  ]),
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createBlock([
                f.createVariableStatement(
                  undefined,
                  f.createVariableDeclarationList(
                    [
                      f.createVariableDeclaration(
                        "operation",
                        undefined,
                        f.createTypeReferenceNode("QueryOperation"),
                        f.createObjectLiteralExpression([
                          f.createPropertyAssignment(
                            "path",
                            f.createStringLiteral(camelizedPathParams(url)),
                          ),
                          f.createPropertyAssignment(
                            "operationId",
                            f.createStringLiteral(operationId),
                          ),
                          f.createShorthandPropertyAssignment(
                            f.createIdentifier("variables"),
                          ),
                        ]),
                      ),
                    ],
                    ts.NodeFlags.Const,
                  ),
                ),
                f.createVariableStatement(
                  undefined,
                  f.createVariableDeclarationList(
                    [
                      f.createVariableDeclaration(
                        f.createObjectBindingPattern([
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("fetcherOptions"),
                            undefined,
                          ),
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("queryOptions"),
                            undefined,
                          ),
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("queryKeyFn"),
                            undefined,
                          ),
                        ]),
                        undefined,
                        undefined,
                        f.createCallExpression(
                          f.createIdentifier(contextHookName),
                          undefined,
                          [
                            f.createIdentifier("operation"),
                            f.createIdentifier("options"),
                          ],
                        ),
                      ),
                    ],
                    ts.NodeFlags.Const,
                  ),
                ),
                f.createReturnStatement(
                  f.createCallExpression(
                    f.createPropertyAccessExpression(
                      f.createIdentifier("reactQuery"),
                      f.createIdentifier("useQuery"),
                    ),
                    [
                      dataType,
                      errorType,
                      f.createTypeReferenceNode(
                        f.createIdentifier("TData"),
                        [],
                      ),
                    ],
                    [
                      f.createObjectLiteralExpression(
                        [
                          f.createPropertyAssignment(
                            "queryKey",
                            f.createCallExpression(
                              f.createIdentifier("queryKeyFn"),
                              undefined,
                              [
                                f.createIdentifier("operation"),
                                f.createIdentifier("fetcherOptions"),
                              ],
                            ),
                          ),
                          f.createPropertyAssignment(
                            "queryFn",
                            f.createArrowFunction(
                              undefined,
                              undefined,
                              [
                                f.createParameterDeclaration(
                                  undefined,
                                  undefined,
                                  f.createObjectBindingPattern([
                                    f.createBindingElement(
                                      undefined,
                                      undefined,
                                      "signal",
                                    ),
                                  ]),
                                ),
                              ],
                              undefined,
                              f.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken,
                              ),
                              f.createCallExpression(
                                f.createIdentifier(operationFetcherFnName),
                                undefined,
                                [
                                  f.createObjectLiteralExpression(
                                    [
                                      f.createSpreadAssignment(
                                        f.createIdentifier("fetcherOptions"),
                                      ),
                                      f.createSpreadAssignment(
                                        f.createIdentifier("variables"),
                                      ),
                                    ],
                                    false,
                                  ),
                                  f.createIdentifier("signal"),
                                ],
                              ),
                            ),
                          ),
                          f.createSpreadAssignment(
                            f.createIdentifier("options"),
                          ),
                          f.createSpreadAssignment(
                            f.createIdentifier("queryOptions"),
                          ),
                        ],
                        true,
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );

  return nodes;
};

const createInfiniteQueryHook = ({
  operationFetcherFnName,
  contextHookName,
  dataType,
  errorType,
  variablesType,
  name,
  operationId,
  operation,
  url,
}: {
  operationFetcherFnName: string;
  contextHookName: string;
  name: string;
  operationId: string;
  url: string;
  dataType: ts.TypeNode;
  errorType: ts.TypeNode;
  variablesType: ts.TypeNode;
  operation: OperationObject;
}) => {
  const nodes: ts.Node[] = [];
  if (operation.description) {
    nodes.push(f.createJSDocComment(operation.description.trim(), []));
  }
  nodes.push(
    f.createVariableStatement(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            f.createIdentifier(name),
            undefined,
            undefined,
            f.createArrowFunction(
              undefined,
              [
                f.createTypeParameterDeclaration(
                  undefined,
                  "TData",
                  undefined,
                  f.createTypeReferenceNode("reactQuery.InfiniteData", [
                    dataType,
                  ]),
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  variablesType,
                ),
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode("UseInfiniteQueryOptions", [
                    dataType,
                    errorType,
                    f.createTypeReferenceNode("TData"),
                  ]),
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createBlock([
                f.createVariableStatement(
                  undefined,
                  f.createVariableDeclarationList(
                    [
                      f.createVariableDeclaration(
                        "operation",
                        undefined,
                        f.createTypeReferenceNode("QueryOperation"),
                        f.createObjectLiteralExpression([
                          f.createPropertyAssignment(
                            "path",
                            f.createStringLiteral(camelizedPathParams(url)),
                          ),
                          f.createPropertyAssignment(
                            "operationId",
                            f.createStringLiteral(operationId),
                          ),
                          f.createShorthandPropertyAssignment(
                            f.createIdentifier("variables"),
                          ),
                        ]),
                      ),
                    ],
                    ts.NodeFlags.Const,
                  ),
                ),
                f.createVariableStatement(
                  undefined,
                  f.createVariableDeclarationList(
                    [
                      f.createVariableDeclaration(
                        f.createObjectBindingPattern([
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("fetcherOptions"),
                            undefined,
                          ),
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("queryOptions"),
                            undefined,
                          ),
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("queryKeyFn"),
                            undefined,
                          ),
                          f.createBindingElement(
                            undefined,
                            undefined,
                            f.createIdentifier("paginateVariables"),
                            undefined,
                          ),
                          f.createBindingElement(
                            f.createToken(ts.SyntaxKind.DotDotDotToken),
                            undefined,
                            f.createIdentifier("paginationOptions"),
                            undefined,
                          ),
                        ]),
                        undefined,
                        undefined,
                        f.createCallExpression(
                          f.createIdentifier(contextHookName),
                          undefined,
                          [
                            f.createIdentifier("operation"),
                            f.createIdentifier("options"),
                          ],
                        ),
                      ),
                    ],
                    ts.NodeFlags.Const,
                  ),
                ),
                f.createReturnStatement(
                  f.createCallExpression(
                    f.createPropertyAccessExpression(
                      f.createIdentifier("reactQuery"),
                      f.createIdentifier("useInfiniteQuery"),
                    ),
                    [
                      dataType,
                      errorType,
                      f.createTypeReferenceNode(
                        f.createIdentifier("TData"),
                        [],
                      ),
                    ],
                    [
                      f.createObjectLiteralExpression(
                        [
                          f.createPropertyAssignment(
                            "queryKey",
                            f.createCallExpression(
                              f.createIdentifier("queryKeyFn"),
                              undefined,
                              [
                                f.createIdentifier("operation"),
                                f.createIdentifier("fetcherOptions"),
                              ],
                            ),
                          ),
                          f.createPropertyAssignment(
                            "queryFn",
                            f.createArrowFunction(
                              undefined,
                              undefined,
                              [
                                f.createParameterDeclaration(
                                  undefined,
                                  undefined,
                                  f.createObjectBindingPattern([
                                    f.createBindingElement(
                                      undefined,
                                      undefined,
                                      "signal",
                                    ),
                                    f.createBindingElement(
                                      undefined,
                                      undefined,
                                      "pageParam",
                                    ),
                                  ]),
                                ),
                              ],
                              undefined,
                              f.createToken(
                                ts.SyntaxKind.EqualsGreaterThanToken,
                              ),
                              f.createCallExpression(
                                f.createIdentifier(operationFetcherFnName),
                                undefined,
                                [
                                  f.createCallExpression(
                                    f.createIdentifier("paginateVariables"),
                                    undefined,
                                    [
                                      f.createAsExpression(
                                        f.createIdentifier("pageParam"),
                                        f.createTypeQueryNode(
                                          f.createIdentifier(
                                            "paginationOptions.initialPageParam",
                                          ),
                                        ),
                                      ),
                                      f.createObjectLiteralExpression(
                                        [
                                          f.createSpreadAssignment(
                                            f.createIdentifier(
                                              "fetcherOptions",
                                            ),
                                          ),
                                          f.createSpreadAssignment(
                                            f.createIdentifier("variables"),
                                          ),
                                        ],
                                        false,
                                      ),
                                    ],
                                  ),
                                  f.createIdentifier("signal"),
                                ],
                              ),
                            ),
                          ),
                          f.createSpreadAssignment(
                            f.createIdentifier("paginationOptions"),
                          ),
                          f.createSpreadAssignment(
                            f.createIdentifier("options"),
                          ),
                          f.createSpreadAssignment(
                            f.createIdentifier("queryOptions"),
                          ),
                        ],
                        true,
                      ),
                    ],
                  ),
                ),
              ]),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );

  return nodes;
};

const createReactQueryImport = () =>
  f.createImportDeclaration(
    undefined,
    f.createImportClause(
      false,
      undefined,
      f.createNamespaceImport(f.createIdentifier("reactQuery")),
    ),
    f.createStringLiteral("@tanstack/react-query"),
    undefined,
  );
