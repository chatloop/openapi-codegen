import { petstore } from "../fixtures/petstore";
import { forceReactQueryComponent } from "./forceReactQueryComponent";

describe("forceReactQueryComponent", () => {
  it("should add the extension to the targeted operationId", () => {
    const updatedOpenAPIDocument = forceReactQueryComponent({
      openAPIDocument: petstore,
      component: "useMutation",
      operationIdMatcher: "findPets",
    });

    expect(
      updatedOpenAPIDocument.paths["/pets"].get["x-openapi-codegen-component"],
    ).toBe("useMutation");
  });
  it("should throw if the operationId is not found", () => {
    expect(() =>
      forceReactQueryComponent({
        openAPIDocument: petstore,
        component: "useMutation",
        operationIdMatcher: "notFound",
      }),
    ).toThrow(
      `[forceReactQueryComponent] Operation with the operationId "notFound" not found`,
    );
  });

  it("should not mutate the original openAPIDocument", () => {
    const originalDocument = petstore;
    forceReactQueryComponent({
      openAPIDocument: originalDocument,
      component: "useMutation",
      operationIdMatcher: "findPets",
    });

    expect(
      originalDocument.paths["/pets"].get["x-openapi-codegen-component"],
    ).toBeUndefined();
  });
});
