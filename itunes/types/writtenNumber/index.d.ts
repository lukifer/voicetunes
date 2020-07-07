declare module "written-number" {
  type writtenNumberOptions = {
    alternativeBase?: number | null,
    lang?: string,
    noAnd?: boolean,
  }

  function writtenNumber (n: number, options?: writtenNumberOptions): string;
  export = writtenNumber;
}
