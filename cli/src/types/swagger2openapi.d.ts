declare module "swagger2openapi" {
  import { OpenAPIObject } from "openapi3-ts/oas31";
  interface ConverObjCallbackData {
    openapi: OpenAPIObject;
  }
  function convertObj(
    schema: unknown,
    options: {},
    callback: (err: Error, data: ConverObjCallbackData) => void,
  ): void;
}
