import ts, { factory as f } from "typescript";
import * as c from "case";

import { ConfigBase, Context } from "./types";
import {
  isReferenceObject,
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
import { isJsonApiOperationPaginated } from "../core/isJsonApiResponsePaginated";
import { determineComponentForOperations } from "../core/determineComponentForOperations";

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

  const nodes: ts.Node[] = [];

  const operationIds: string[] = [];

  const resources: Record<
    string,
    { name: string; node: ts.TypeReferenceNode }
  > = {};

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
        resources[resourceType] = {
          name: c.pascal(name),
          node: f.createTypeReferenceNode(
            f.createQualifiedName(
              f.createIdentifier("Schemas"),
              f.createIdentifier(c.pascal(name)),
            ),
          ),
        };
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
      Object.entries(resources).map(([name, { node }]) =>
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
      f.createUnionTypeNode(Object.values(resources).map(({ node }) => node)),
    ),
  );
  context.openAPIDocument.paths &&
    Object.entries(context.openAPIDocument.paths).forEach(
      ([route, verbs]: [string, PathItemObject]) => {
        Object.entries(verbs).forEach(([verb, operation]) => {
          if (!isVerb(verb) || !isOperationObject(operation)) return;
          const operationId = operation.operationId;

          const resourceType = getJsonApiResponseResource(
            operation.responses,
            context.openAPIDocument,
          );
          if (resourceType === undefined) {
            return;
          }
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

          const component: "useQuery" | "useMutate" | "useInfiniteQuery" =
            operation["x-openapi-codegen-component"] ||
            (verb === "get"
              ? isPaginated
                ? "useInfiniteQuery"
                : "useQuery"
              : "useMutate");

          if (
            !["useQuery", "useMutate", "useInfiniteQuery"].includes(component)
          ) {
            throw new Error(`[x-openapi-codegen-component] Invalid value for ${operation.operationId} operation
          Valid options: "useMutate", "useQuery", "useInfiniteQuery"`);
          }

          if (component === "useInfiniteQuery" && !isPaginated) {
            throw new Error(
              `[x-openapi-codegen-component] Invalid value for ${operation.operationId} operation, the does not appear to be paginated, its missing pagination query parameters`,
            );
          }

          let hook: ts.Node[] = [];

          // noinspection JSUnreachableSwitchBranches <-- phpstorm is confused :S
          switch (component) {
            case "useInfiniteQuery":
              hook = createInfiniteQueryHook({
                operation,
                dataType: c.pascal(`${operationId}Response`),
                errorType: c.pascal(`${operationId}Error`),
                variablesType: c.pascal(`${operationId}Variables`),
                name: `use${c.pascal(operationId)}`,
                resourceType: resourceType.resourceType,
              });
              break;
            case "useQuery":
              hook = createQueryHook({
                operation,
                dataType: c.pascal(`${operationId}Response`),
                errorType: c.pascal(`${operationId}Error`),
                variablesType: c.pascal(`${operationId}Variables`),
                name: `use${c.pascal(operationId)}`,
                resourceType,
              });
              break;
            case "useMutate":
              // hook = createMutationHook({
              //   operation,
              //   dataType: c.pascal(`${operationId}Response`),
              //   errorType: c.pascal(`${operationId}Error`),
              //   variablesType: c.pascal(`${operationId}Variables`),
              //   name: `use${c.pascal(operationId)}`,
              // });
              break;
          }

          nodes.push(...hook);
        });
      },
    );

  if (operationIds.length === 0) {
    console.log(`⚠️ You don't have any operation with "operationId" defined!`);
  }

  const { nodes: usedImportsNodes } = getUsedImports(nodes, {
    ...config.schemasFiles,
  });

  await context.writeFile(
    filename + ".ts",
    printNodes([
      createWatermark(context.openAPIDocument.info),
      createReactQueryImport(),
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

// const createMutationHook = ({
//   dataType,
//   errorType,
//   variablesType,
//   name,
//   operation,
// }: {
//   name: string;
//   dataType: string;
//   errorType: string;
//   variablesType: string;
//   operation: OperationObject;
// }) => {
//   const nodes: ts.Node[] = [];
//   if (operation.description) {
//     nodes.push(f.createJSDocComment(operation.description.trim(), []));
//   }
//
//   nodes.push(
//     f.createVariableStatement(
//       [f.createModifier(ts.SyntaxKind.ExportKeyword)],
//       f.createVariableDeclarationList(
//         [
//           f.createVariableDeclaration(
//             f.createIdentifier(name),
//             undefined,
//             undefined,
//             f.createArrowFunction(
//               undefined,
//               undefined,
//               [
//                 f.createParameterDeclaration(
//                   undefined,
//                   undefined,
//                   f.createIdentifier("options"),
//                   f.createToken(ts.SyntaxKind.QuestionToken),
//                   f.createTypeReferenceNode(f.createIdentifier("Omit"), [
//                     f.createTypeReferenceNode(
//                       f.createQualifiedName(
//                         f.createIdentifier("reactQuery"),
//                         f.createIdentifier("UseMutationOptions"),
//                       ),
//                       [dataType, errorType, variablesType],
//                     ),
//                     f.createLiteralTypeNode(
//                       f.createStringLiteral("mutationFn"),
//                     ),
//                   ]),
//                   undefined,
//                 ),
//               ],
//               undefined,
//               f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
//               f.createBlock(
//                 [
//                   f.createVariableStatement(
//                     undefined,
//                     f.createVariableDeclarationList(
//                       [
//                         f.createVariableDeclaration(
//                           f.createObjectBindingPattern([
//                             f.createBindingElement(
//                               undefined,
//                               undefined,
//                               f.createIdentifier("fetcherOptions"),
//                               undefined,
//                             ),
//                           ]),
//                           undefined,
//                           undefined,
//                           f.createCallExpression(
//                             f.createIdentifier(contextHookName),
//                             undefined,
//                             [],
//                           ),
//                         ),
//                       ],
//                       ts.NodeFlags.Const,
//                     ),
//                   ),
//                   f.createReturnStatement(
//                     f.createCallExpression(
//                       f.createPropertyAccessExpression(
//                         f.createIdentifier("reactQuery"),
//                         f.createIdentifier("useMutation"),
//                       ),
//                       [dataType, errorType, variablesType],
//                       [
//                         f.createObjectLiteralExpression(
//                           [
//                             f.createPropertyAssignment(
//                               "mutationFn",
//                               f.createArrowFunction(
//                                 undefined,
//                                 undefined,
//                                 [
//                                   f.createParameterDeclaration(
//                                     undefined,
//                                     undefined,
//                                     f.createIdentifier("variables"),
//                                     undefined,
//                                     variablesType,
//                                     undefined,
//                                   ),
//                                 ],
//                                 undefined,
//                                 f.createToken(
//                                   ts.SyntaxKind.EqualsGreaterThanToken,
//                                 ),
//                                 f.createCallExpression(
//                                   f.createIdentifier(operationFetcherFnName),
//                                   undefined,
//                                   [
//                                     f.createObjectLiteralExpression(
//                                       [
//                                         f.createSpreadAssignment(
//                                           f.createIdentifier("fetcherOptions"),
//                                         ),
//                                         f.createSpreadAssignment(
//                                           f.createIdentifier("variables"),
//                                         ),
//                                       ],
//                                       false,
//                                     ),
//                                   ],
//                                 ),
//                               ),
//                             ),
//                             f.createSpreadAssignment(
//                               f.createIdentifier("options"),
//                             ),
//                           ],
//                           true,
//                         ),
//                       ],
//                     ),
//                   ),
//                 ],
//                 true,
//               ),
//             ),
//           ),
//         ],
//         ts.NodeFlags.Const,
//       ),
//     ),
//   );
//
//   return nodes;
// };
//
const createQueryHook = ({
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  resourceType,
}: {
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
                  f.createArrayTypeNode(
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ),
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  f.createIntersectionTypeNode([
                    f.createTypeReferenceNode(`Components.${variablesType}`),
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
                  ]),
                ),
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("options"),
                  f.createToken(ts.SyntaxKind.QuestionToken),
                  f.createTypeReferenceNode(f.createIdentifier("Omit"), [
                    f.createTypeReferenceNode("Components.UseQueryOptions", [
                      f.createTypeReferenceNode(`Components.${dataType}`),
                      f.createTypeReferenceNode(`Components.${errorType}`),
                      f.createTypeReferenceNode("TData"),
                    ]),
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
  dataType,
  errorType,
  variablesType,
  name,
  operation,
  resourceType,
}: {
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
                  f.createArrayTypeNode(
                    f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                  ),
                ),
              ],
              [
                f.createParameterDeclaration(
                  undefined,
                  undefined,
                  f.createIdentifier("variables"),
                  undefined,
                  f.createIntersectionTypeNode([
                    f.createTypeReferenceNode(`Components.${variablesType}`),
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
                  ]),
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
