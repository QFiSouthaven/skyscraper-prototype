// Type declarations for packages without @types
declare module "dotenv-safe" {
  export interface Options {
    path?: string;
    default?: Record<string, string>;
    example?: string;
    crossValidate?: boolean;
    includeEmptyValue?: boolean;
  }

  export function config(options?: Options): void;
}
