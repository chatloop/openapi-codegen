import { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";
import ts from "typescript";
import { schemaToEnumDeclaration } from "./schemaToEnumDeclaration";
import { OpenAPIComponentType } from "./schemaToTypeAliasDeclaration";

describe("schemaToTypeAliasDeclaration", () => {
  it("should generate a string enums", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["AVAILABLE", "PENDING", "SOLD", "WITH SPACE"],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
     "export enum Test {
         AVAILABLE = "AVAILABLE",
         PENDING = "PENDING",
         SOLD = "SOLD",
         "WITH SPACE" = "WITH SPACE"
     }"
    `);
  });

  it("should quote string values starting with a digit", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: ["1", "1.0", "1.1.1"],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
     "export enum Test {
         "_1" = "1",
         "_1.0" = "1.0",
         "_1.1.1" = "1.1.1"
     }"
    `);
  });

  it("should generate a int enum", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: [1, 2, 3],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export enum Test {
          ONE = 1,
          TWO = 2,
          THREE = 3
      }"
    `);
  });

  it("should generate a int enum (using big numbers)", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: [0, 7, 15, 100, 1000, 1456, 3217],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export enum Test {
          ZERO = 0,
          SEVEN = 7,
          FIFTEEN = 15,
          ONE_HUNDRED = 100,
          ONE_THOUSAND = 1000,
          ONE_THOUSAND_FOUR_HUNDRED_FIFTY_SIX = 1456,
          THREE_THOUSAND_TWO_HUNDRED_SEVENTEEN = 3217
      }"
    `);
  });

  it("should generate a boolean enum", () => {
    const schema: SchemaObject = {
      type: "string",
      enum: [true, false],
    };

    expect(printSchema(schema)).toMatchInlineSnapshot(`
      "export enum Test {
          True,
          False
      }"
    `);
  });
});

const printSchema = (
  schema: SchemaObject,
  currentComponent: OpenAPIComponentType = "schemas",
  components?: OpenAPIObject["components"],
) => {
  const nodes = schemaToEnumDeclaration("Test", schema, {
    currentComponent,
    openAPIDocument: { components },
  });

  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest,
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  return nodes
    .map((node: ts.Node) =>
      printer.printNode(ts.EmitHint.Unspecified, node, sourceFile),
    )
    .join("\n");
};
