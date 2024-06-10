import ts, { factory as f } from "typescript";
import * as c from "case";

import { ConfigBase, Context } from "./types";
import {
  isReferenceObject,
  OpenAPIObject,
  OperationObject,
  PathItemObject,
} from "openapi3-ts/oas31";

import { getUsedImports } from "../core/getUsedImports";
import { createWatermark } from "../core/createWatermark";
import { isVerb } from "../core/isVerb";
import { isOperationObject } from "../core/isOperationObject";

import { getReferenceSchema } from "../core/getReferenceSchema";
import { isValidPropertyName } from "tsutils";
import { isJsonApiResourceSchema } from "../core/isJsonApiResourceSchema";
import {
  getJsonApiResponseResource,
  JsonApiResponseResource,
} from "../core/getJsonApiResponseResource";
import { generateReactQueryComponents } from "./generateReactQueryComponents";
import { isJsonApiOperationPaginated } from "../core/isJsonApiOperationPaginated";
import { determineComponentForOperations } from "../core/determineComponentForOperations";
import { jsonApiOperationHasIncludes } from "../core/jsonApiOperationHasIncludes";
import {
  getJsonApiRequestResource,
  JsonApiRequestResource,
} from "../core/getJsonApiRequestResource";
import { createNamedImport } from "../core/createNamedImport";
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

export const generateJsonApiReactQueryComponents = async (
  context: Context,
  config: Config,
) => {
  context.openAPIDocument = determineComponentForOperations(
    context.openAPIDocument,
  );
  generateReactQueryComponents(context, config);

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

  const filename = formatFilename(filenamePrefix + "-resources");

  const mutationContextHookName = `use${c.pascal(filenamePrefix)}MutationContext`;

  const nodes: ts.Node[] = [];

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

  const resources: Record<string, ts.TypeReferenceNode> = {};
  const operationResources: Record<string, string> = {};

  context.openAPIDocument.components &&
    context.openAPIDocument.components.schemas &&
    Object.entries(context.openAPIDocument.components.schemas).forEach(
      ([name, schema]) => {
        if (isReferenceObject(schema)) {
          schema = getReferenceSchema(schema.$ref, context.openAPIDocument);
        }
        const resourceSchema = isJsonApiResourceSchema(
          schema,
          context.openAPIDocument,
        );

        if (!resourceSchema) {
          return;
        }

        const resourceType =
          (resourceSchema.properties.type.enum &&
            resourceSchema.properties.type.enum[0]) ||
          resourceSchema.properties.type.const;

        if (resourceType === undefined) {
          return;
        }
        if (resources[resourceType] === undefined) {
          resources[resourceType] = f.createTypeReferenceNode(
            f.createQualifiedName(
              f.createIdentifier("Schemas"),
              f.createIdentifier(c.pascal(name)),
            ),
          );
        }
      },
    );
  if (Object.keys(resources).length === 0) {
    console.error(`⚠️ You don't have any json api resources defined!`);
    return;
  }
  nodes.push(
    f.createInterfaceDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "ResourceMap",
      undefined,
      [
        f.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          f.createExpressionWithTypeArguments(
            f.createIdentifier("Utils.IResourceMap"),
            [],
          ),
        ]),
      ],
      Object.entries(resources).map(([name, node]) =>
        f.createPropertySignature(
          undefined,
          isValidPropertyName(name) ? name : f.createStringLiteral(name),
          undefined,
          node,
        ),
      ),
    ),
  );
  nodes.push(
    f.createTypeAliasDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "Resource",
      undefined,
      f.createUnionTypeNode(Object.values(resources)),
    ),
  );
  context.openAPIDocument.paths &&
    Object.entries(context.openAPIDocument.paths).forEach(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([route, verbs]: [string, PathItemObject]) => {
        Object.entries(verbs).forEach(([verb, operation]) => {
          if (!isVerb(verb) || !isOperationObject(operation)) return;
          const operationId = operation.operationId;

          const responseResourceType = getJsonApiResponseResource(
            operation.responses,
            context.openAPIDocument,
          );

          const requestResourceType = getJsonApiRequestResource(
            operation.requestBody,
            context.openAPIDocument,
          );

          if (operationIds.includes(operationId)) {
            throw new Error(
              `The operationId "${operation.operationId}" is duplicated in your schema definition!`,
            );
          }
          operationIds.push(operationId);
          const isPaginated = isJsonApiOperationPaginated(
            operation,
            context.openAPIDocument,
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

          if (
            responseResourceType === undefined &&
            component !== "useMutation"
          ) {
            return;
          }

          if (responseResourceType !== undefined) {
            operationResources[operationId] = responseResourceType.resourceType;
          }

          let hook: ts.Node[] = [];
          componentsUsed[component] = true;
          switch (component) {
            case "useInfiniteQuery":
              hook = createInfiniteQueryHook({
                openApiDocument: context.openAPIDocument,
                operation,
                dataType: c.pascal(`${operationId}Response`),
                errorType: c.pascal(`${operationId}Error`),
                variablesType: c.pascal(`${operationId}Variables`),
                name: `use${c.pascal(operationId)}`,
                resourceType: responseResourceType!.resourceType,
              });
              break;
            case "useQuery":
              hook = createQueryHook({
                openApiDocument: context.openAPIDocument,
                operation,
                dataType: c.pascal(`${operationId}Response`),
                errorType: c.pascal(`${operationId}Error`),
                variablesType: c.pascal(`${operationId}Variables`),
                name: `use${c.pascal(operationId)}`,
                // @ts-expect-error resourceType is not undefined
                resourceType: responseResourceType,
              });
              break;
            case "useMutation":
              hook = createMutationHook({
                openApiDocument: context.openAPIDocument,
                operation,
                operationFetcherFnName: `fetch${c.pascal(operationId)}`,
                dataType: c.pascal(`${operationId}Response`),
                errorType: c.pascal(`${operationId}Error`),
                variablesType: c.pascal(`${operationId}Variables`),
                contextHookName: mutationContextHookName,
                name: `use${c.pascal(operationId)}`,
                requestResourceType,
                responseResourceType,
                operationId,
                url: route,
                verb,
              });
              break;
          }

          nodes.push(...hook);
        });
      },
    );

  if (operationIds.length === 0) {
    console.log(`⚠️ You don't have any operation with "operationId" defined!`);
  }

  nodes.push(
    f.createInterfaceDeclaration(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      "OperationResourceMap",
      undefined,
      [
        f.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
          f.createExpressionWithTypeArguments(
            f.createIdentifier("Utils.IResourceMap"),
            [],
          ),
        ]),
      ],
      Object.entries(operationResources).map(([operationId, resource]) =>
        f.createPropertySignature(
          undefined,
          isValidPropertyName(operationId)
            ? operationId
            : f.createStringLiteral(operationId),
          undefined,
          resources[resource],
        ),
      ),
    ),
  );

  nodes.push(
    f.createVariableStatement(
      [f.createModifier(ts.SyntaxKind.ExportKeyword)],
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            f.createIdentifier("operationsResourceMap"),
            undefined,
            f.createTypeReferenceNode("Record", [
              f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
              f.createTypeOperatorNode(
                ts.SyntaxKind.KeyOfKeyword,
                f.createTypeReferenceNode("ResourceMap"),
              ),
            ]),
            f.createObjectLiteralExpression(
              Object.entries(operationResources).map(
                ([operationId, resource]) =>
                  f.createPropertyAssignment(
                    isValidPropertyName(operationId)
                      ? operationId
                      : f.createStringLiteral(operationId),
                    f.createStringLiteral(resource),
                  ),
              ),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
  );
  const { nodes: usedImportsNodes } = getUsedImports(nodes, {
    ...config.schemasFiles,
  });

  const componentContextImports = [
    ...(componentsUsed["useMutation"] ? [mutationContextHookName] : []),
  ];

  const componentContextImportsNode: ts.Node[] =
    componentContextImports.length > 0
      ? [
          createNamedImport(
            componentContextImports,
            `./${formatFilename(filenamePrefix + "-context")}`,
          ),
        ]
      : [];

  await context.writeFile(
    filename + ".ts",
    printNodes([
      createWatermark(context.openAPIDocument.info),
      createReactQueryImport(),
      ...componentContextImportsNode,
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          false,
          undefined,
          f.createNamespaceImport(f.createIdentifier("Components")),
        ),
        f.createStringLiteral(
          `./${formatFilename(filenamePrefix + "-components")}`,
        ),
        undefined,
      ),
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          false,
          undefined,
          f.createNamespaceImport(f.createIdentifier("Utils")),
        ),
        f.createStringLiteral(`./${formatFilename(filenamePrefix + "-utils")}`),
        undefined,
      ),
      ...usedImportsNodes,
      ...nodes,
    ]),
  );
};

const createMutationHook = ({
  openApiDocument,
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  contextHookName,
  requestResourceType,
  responseResourceType,
  operationFetcherFnName,
  operationId,
  url,
  verb,
}: {
  name: string;
  dataType: string;
  errorType: string;
  variablesType: string;
  operation: OperationObject;
  openApiDocument: OpenAPIObject;
  contextHookName: string;
  requestResourceType?: JsonApiRequestResource;
  responseResourceType?: JsonApiResponseResource;
  operationFetcherFnName: string;
  operationId: string;
  url: string;
  verb: "get" | "put" | "post" | "patch" | "delete";
}) => {
  const nodes: ts.Node[] = [];

  const operationDeclaration = (variables: string) =>
    f.createVariableDeclaration(
      "operation",
      undefined,
      f.createTypeReferenceNode("Components.MutationOperation"),
      f.createObjectLiteralExpression([
        f.createPropertyAssignment("method", f.createStringLiteral(verb)),
        f.createPropertyAssignment(
          "path",
          f.createStringLiteral(camelizedPathParams(url)),
        ),
        f.createPropertyAssignment(
          "operationId",
          f.createStringLiteral(operationId),
        ),
        f.createPropertyAssignment("variables", f.createIdentifier(variables)),
      ]),
    );

  const useMutationCall = f.createCallExpression(
    f.createPropertyAccessExpression(
      f.createIdentifier("Components"),
      f.createIdentifier(name),
    ),
    undefined,
    [
      f.createObjectLiteralExpression(
        [
          ...(verb === "patch"
            ? [
                f.createPropertyAssignment(
                  "onMutate",
                  f.createArrowFunction(
                    undefined,
                    undefined,
                    [
                      f.createParameterDeclaration(
                        undefined,
                        undefined,
                        f.createIdentifier("variables"),
                        undefined,
                        undefined,
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
                            operationDeclaration("variables"),
                            f.createVariableDeclaration(
                              f.createObjectBindingPattern([
                                f.createBindingElement(
                                  undefined,
                                  undefined,
                                  f.createIdentifier("onMutate"),
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
                      f.createIfStatement(
                        f.createIdentifier("onMutate"),
                        f.createBlock([
                          f.createExpressionStatement(
                            f.createCallExpression(
                              f.createIdentifier("onMutate"),
                              undefined,
                              [f.createIdentifier("variables")],
                            ),
                          ),
                        ]),
                        undefined,
                      ),
                    ]),
                  ),
                ),
              ]
            : []),
          ...(verb === "post" || verb === "delete"
            ? [
                f.createPropertyAssignment(
                  "onSuccess",
                  f.createArrowFunction(
                    undefined,
                    undefined,
                    [
                      f.createParameterDeclaration(
                        undefined,
                        undefined,
                        f.createIdentifier("data"),
                        undefined,
                        undefined,
                        undefined,
                      ),
                      f.createParameterDeclaration(
                        undefined,
                        undefined,
                        f.createIdentifier("variables"),
                        undefined,
                        undefined,
                        undefined,
                      ),
                      f.createParameterDeclaration(
                        undefined,
                        undefined,
                        f.createIdentifier("context"),
                        undefined,
                        undefined,
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
                            operationDeclaration("variables"),
                            f.createVariableDeclaration(
                              f.createObjectBindingPattern([
                                f.createBindingElement(
                                  undefined,
                                  undefined,
                                  f.createIdentifier("onSuccess"),
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
                      f.createIfStatement(
                        f.createIdentifier("onSuccess"),
                        f.createBlock([
                          f.createExpressionStatement(
                            f.createCallExpression(
                              f.createIdentifier("onSuccess"),
                              undefined,
                              [
                                f.createIdentifier("data"),
                                f.createIdentifier("variables"),
                                f.createIdentifier("context"),
                                f.createIdentifier("queryClient"),
                              ],
                            ),
                          ),
                        ]),
                        undefined,
                      ),
                    ]),
                  ),
                ),
              ]
            : []),
          f.createSpreadAssignment(f.createIdentifier("options")),
        ],
        true,
      ),
    ],
  );

  if (operation.description) {
    nodes.push(f.createJSDocComment(operation.description.trim(), []));
  }
  const operationHasIncludes = jsonApiOperationHasIncludes(
    operation,
    openApiDocument,
  );

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
              responseResourceType && operationHasIncludes
                ? [
                    f.createTypeParameterDeclaration(
                      undefined,
                      "Includes",
                      f.createArrayTypeNode(
                        f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                      ),
                      f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
                    ),
                  ]
                : undefined,
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode(f.createIdentifier("Omit"), [
                    f.createTypeReferenceNode(
                      f.createQualifiedName(
                        f.createIdentifier("reactQuery"),
                        f.createIdentifier("UseMutationOptions"),
                      ),
                      [
                        responseResourceType
                          ? f.createTypeReferenceNode(`Components.${dataType}`)
                          : f.createToken(ts.SyntaxKind.UndefinedKeyword),
                        f.createTypeReferenceNode(`Components.${errorType}`),
                        f.createTypeReferenceNode(
                          `Components.${variablesType}`,
                        ),
                      ],
                    ),
                    f.createUnionTypeNode([
                      f.createLiteralTypeNode(
                        f.createStringLiteral("mutationFn"),
                      ),
                      ...(verb === "patch"
                        ? [
                            f.createLiteralTypeNode(
                              f.createStringLiteral("onMutate"),
                            ),
                          ]
                        : []),
                      ...(verb === "post" || verb === "delete"
                        ? [
                            f.createLiteralTypeNode(
                              f.createStringLiteral("onSuccess"),
                            ),
                          ]
                        : []),
                    ]),
                  ]),
                  undefined,
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createBlock(
                [
                  ...(verb === "post" || verb === "delete"
                    ? [
                        f.createVariableStatement(
                          undefined,
                          f.createVariableDeclarationList(
                            [
                              f.createVariableDeclaration(
                                f.createIdentifier("queryClient"),
                                undefined,
                                undefined,
                                f.createCallExpression(
                                  f.createPropertyAccessExpression(
                                    f.createIdentifier("reactQuery"),
                                    f.createIdentifier("useQueryClient"),
                                  ),
                                  undefined,
                                  undefined,
                                ),
                              ),
                            ],
                            ts.NodeFlags.Const,
                          ),
                        ),
                      ]
                    : []),
                  ...(responseResourceType
                    ? [
                        f.createVariableStatement(
                          undefined,
                          f.createVariableDeclarationList(
                            [
                              f.createVariableDeclaration(
                                f.createIdentifier("useMutationResult"),
                                undefined,
                                undefined,
                                useMutationCall,
                              ),
                            ],
                            ts.NodeFlags.Const,
                          ),
                        ),
                      ]
                    : []),
                  f.createReturnStatement(
                    responseResourceType
                      ? f.createObjectLiteralExpression([
                          f.createSpreadAssignment(
                            f.createIdentifier("useMutationResult"),
                          ),
                          f.createPropertyAssignment(
                            "data",
                            f.createCallExpression(
                              f.createIdentifier("Utils.deserializeResource"),
                              [
                                f.createLiteralTypeNode(
                                  f.createStringLiteral(
                                    responseResourceType.resourceType,
                                  ),
                                ),
                                operationHasIncludes
                                  ? f.createIndexedAccessTypeNode(
                                      f.createTypeReferenceNode(
                                        f.createIdentifier("Includes"),
                                      ),
                                      f.createLiteralTypeNode(
                                        f.createNumericLiteral("number"),
                                      ),
                                    )
                                  : f.createLiteralTypeNode(
                                      f.createStringLiteral(""),
                                    ),
                                f.createTypeReferenceNode(
                                  f.createIdentifier("ResourceMap"),
                                ),
                              ],
                              [
                                f.createPropertyAccessExpression(
                                  f.createIdentifier("useMutationResult"),
                                  f.createIdentifier("data"),
                                ),
                              ],
                            ),
                          ),
                        ])
                      : useMutationCall,
                  ),
                ],
                true,
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
  openApiDocument,
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  resourceType,
}: {
  openApiDocument: OpenAPIObject;
  name: string;
  dataType: string;
  errorType: string;
  variablesType: string;
  operation: OperationObject;
  resourceType: JsonApiResponseResource;
}) => {
  const deserializerName = resourceType.isArray
    ? "deserializeResourceCollection"
    : "deserializeResource";

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
                  f.createTypeReferenceNode(`Components.${dataType}`),
                ),
                f.createTypeParameterDeclaration(
                  undefined,
                  "Includes",
                  f.createArrayTypeNode(
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ),
                  f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  createVariableType(
                    `Components.${variablesType}`,
                    operation,
                    openApiDocument,
                  ),
                ),
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode("Components.UseQueryOptions", [
                    f.createTypeReferenceNode(`Components.${dataType}`),
                    f.createTypeReferenceNode(`Components.${errorType}`),
                    f.createTypeReferenceNode("TData"),
                  ]),
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createCallExpression(
                f.createIdentifier(`Components.${name}`),
                undefined,
                [
                  f.createIdentifier("variables"),
                  f.createObjectLiteralExpression([
                    f.createSpreadAssignment(f.createIdentifier("options")),
                    f.createPropertyAssignment(
                      "select",
                      f.createArrowFunction(
                        undefined,
                        undefined,
                        [
                          f.createParameterDeclaration(
                            undefined,
                            undefined,
                            f.createIdentifier("data"),
                            undefined,
                          ),
                        ],
                        undefined,
                        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        f.createCallExpression(
                          f.createIdentifier(`Utils.${deserializerName}`),
                          [
                            f.createLiteralTypeNode(
                              f.createStringLiteral(resourceType.resourceType),
                            ),
                            f.createIndexedAccessTypeNode(
                              f.createTypeReferenceNode(
                                f.createIdentifier("Includes"),
                              ),
                              f.createLiteralTypeNode(
                                f.createNumericLiteral("number"),
                              ),
                            ),
                            f.createTypeReferenceNode(
                              f.createIdentifier("ResourceMap"),
                            ),
                          ],
                          [f.createIdentifier("data")],
                        ),
                      ),
                    ),
                  ]),
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

const createInfiniteQueryHook = ({
  openApiDocument,
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  resourceType,
}: {
  openApiDocument: OpenAPIObject;
  name: string;
  dataType: string;
  errorType: string;
  variablesType: string;
  operation: OperationObject;
  resourceType: string;
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
                    f.createTypeReferenceNode(`Components.${dataType}`),
                  ]),
                ),
                f.createTypeParameterDeclaration(
                  undefined,
                  "Includes",
                  f.createArrayTypeNode(
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ),
                  f.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword),
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  createVariableType(
                    `Components.${variablesType}`,
                    operation,
                    openApiDocument,
                  ),
                ),
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode(f.createIdentifier("Omit"), [
                    f.createTypeReferenceNode(
                      "Components.UseInfiniteQueryOptions",
                      [
                        f.createTypeReferenceNode(`Components.${dataType}`),
                        f.createTypeReferenceNode(`Components.${errorType}`),
                        f.createTypeReferenceNode("TData"),
                      ],
                    ),
                    f.createLiteralTypeNode(f.createStringLiteral("select")),
                  ]),
                ),
              ],
              undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
              f.createCallExpression(
                f.createIdentifier(`Components.${name}`),
                undefined,
                [
                  f.createIdentifier("variables"),
                  f.createObjectLiteralExpression([
                    f.createSpreadAssignment(f.createIdentifier("options")),
                    f.createPropertyAssignment(
                      "select",
                      f.createArrowFunction(
                        undefined,
                        undefined,
                        [
                          f.createParameterDeclaration(
                            undefined,
                            undefined,
                            f.createIdentifier("data"),
                            undefined,
                          ),
                        ],
                        undefined,
                        f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                        f.createCallExpression(
                          f.createIdentifier(
                            "Utils.deserializeInfiniteResourceCollection",
                          ),
                          [
                            f.createLiteralTypeNode(
                              f.createStringLiteral(resourceType),
                            ),
                            f.createIndexedAccessTypeNode(
                              f.createTypeReferenceNode(
                                f.createIdentifier("Includes"),
                              ),
                              f.createLiteralTypeNode(
                                f.createNumericLiteral("number"),
                              ),
                            ),
                            f.createTypeReferenceNode(
                              f.createIdentifier("ResourceMap"),
                            ),
                          ],
                          [f.createIdentifier("data")],
                        ),
                      ),
                    ),
                  ]),
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

const createVariableType = (
  variablesType: string,
  operation: OperationObject,
  openApiDocument: OpenAPIObject,
) => {
  if (jsonApiOperationHasIncludes(operation, openApiDocument)) {
    return f.createIntersectionTypeNode([
      f.createTypeReferenceNode(variablesType),
      f.createTypeLiteralNode([
        f.createPropertySignature(
          undefined,
          "queryParams",
          f.createToken(ts.SyntaxKind.QuestionToken),
          f.createTypeLiteralNode([
            f.createPropertySignature(
              undefined,
              "include",
              f.createToken(ts.SyntaxKind.QuestionToken),
              f.createTypeReferenceNode("Includes"),
            ),
          ]),
        ),
      ]),
    ]);
  }

  return f.createTypeReferenceNode(variablesType);
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
