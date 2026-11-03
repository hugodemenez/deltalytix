import { describe, expect, it } from "vitest";
import {
  isRepoSourceFile,
  nodeModulePackage,
  shouldDropTracedFile,
} from "./prune-function-traces.mjs";

const supportChat = "app/api/ai/support/route";
const translateLabel = "app/api/ai/support/translate-label/route";
const journalDocx = "app/api/journal-docx/route";

describe("prune-function-traces", () => {
  it("identifies node_modules package names from NFT relative paths", () => {
    expect(
      nodeModulePackage(
        "../../../../../../../node_modules/typescript/lib/typescript.js",
      ),
    ).toBe("typescript");
    expect(
      nodeModulePackage(
        "../../../../../../../node_modules/@babel/types/lib/index.js",
      ),
    ).toBe("@babel/types");
    expect(
      nodeModulePackage(
        "../../../../../../../node_modules/docx/dist/index.mjs",
      ),
    ).toBe("docx");
  });

  it("drops toolchain, browsers, and unused natives from every route", () => {
    expect(
      shouldDropTracedFile(
        "../../../../../../../node_modules/typescript/lib/typescript.js",
        supportChat,
      ),
    ).toBe(true);
    expect(
      shouldDropTracedFile(
        "../../../../../../../node_modules/playwright-core/index.js",
        journalDocx,
      ),
    ).toBe(true);
    expect(
      shouldDropTracedFile(
        "../../../../../../../node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips-cpp.so.42",
        journalDocx,
      ),
    ).toBe(true);
    expect(
      shouldDropTracedFile(
        "../../../../../../../lib/docx/journal.test.ts",
        supportChat,
      ),
    ).toBe(true);
  });

  it("keeps docx on the Word export route and strips it elsewhere", () => {
    const docx = "../../../../../../../node_modules/docx/dist/index.mjs";
    expect(shouldDropTracedFile(docx, journalDocx)).toBe(false);
    expect(shouldDropTracedFile(docx, supportChat)).toBe(true);
    expect(shouldDropTracedFile(docx, translateLabel)).toBe(true);
  });

  it("strips the support corpus from nested title-translation but not the chat route", () => {
    const corpusFile = "../../../../../../../lib/docx/journal-document.ts";
    expect(isRepoSourceFile(corpusFile)).toBe(true);
    expect(shouldDropTracedFile(corpusFile, translateLabel)).toBe(true);
    expect(shouldDropTracedFile(corpusFile, supportChat)).toBe(false);
    expect(
      shouldDropTracedFile("./route_client-reference-manifest.js", translateLabel),
    ).toBe(false);
  });
});
