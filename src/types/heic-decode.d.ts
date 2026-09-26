declare module "heic-decode" {
  interface Decoded { width: number; height: number; data: ArrayBuffer }
  function decode(input: { buffer: Buffer | Uint8Array }): Promise<Decoded>;
  export default decode;
}
