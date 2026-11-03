declare module "next/dist/compiled/picomatch/index.js" {
  const picomatch: (
    glob: string,
    options?: { dot?: boolean; contains?: boolean },
  ) => (input: string) => boolean;
  export default picomatch;
}
