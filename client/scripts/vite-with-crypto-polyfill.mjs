import * as nodeCrypto from "node:crypto";
import { build } from "vite";

const { createHash, webcrypto } = nodeCrypto;

const toBuffer = (input) => {
  if (typeof input === "string") {
    return Buffer.from(input);
  }

  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }

  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }

  if (Array.isArray(input)) {
    return Buffer.from(input);
  }

  return Buffer.from(String(input));
};

const applyHashPolyfill = (target) => {
  if (!target || typeof target.hash === "function") {
    return;
  }

  // Minimal polyfill to emulate crypto.hash using createHash
  target.hash = (algorithm, data, encoding) => {
    const hash = createHash(algorithm);
    hash.update(toBuffer(data));
    return encoding ? hash.digest(encoding) : hash.digest();
  };
};

applyHashPolyfill(nodeCrypto);
applyHashPolyfill(nodeCrypto.default);

if (!globalThis.crypto && webcrypto) {
  globalThis.crypto = webcrypto;
}

await build();
