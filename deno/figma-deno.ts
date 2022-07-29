import { bundle } from "https://deno.land/x/emit@0.4.0/mod.ts";
import { createCache } from "https://deno.land/x/deno_cache@0.4.1/mod.ts";

import { getConnection } from "./getConnection.ts";

export async function getFigmaPluginConnection(options: {
  fileKey: string;
  /**
   * Sets a debug statement at the start of the imported
   * code, so that when run in figma,
   */
  inspectBreak?: boolean;
}) {
  console.log("waiting for connection to file");
  const connection = await getConnection({ fileKey: options.fileKey });
  console.log("connected to file");
  return new FigmaPluginConnection({ fileKey: options.fileKey, connection });
}

class FigmaPluginConnection {
  #fileKey: string;
  #connection: Awaited<ReturnType<typeof getConnection>>;

  constructor(
    options: {
      fileKey: string;
      connection: Awaited<ReturnType<typeof getConnection>>;
    },
  ) {
    this.#fileKey = options.fileKey;
    this.#connection = options.connection;
  }

  async run<FigmaScriptResult>(
    setupFigmaScriptImport: Promise<{
      default: { figmaScript: () => FigmaScriptResult; fileName: string };
    }>,
  ): Promise<FigmaScriptResult> {
    const { fileName } = (await setupFigmaScriptImport)["default"];
    console.log("starting run for file", fileName);

    const cache = createCache();

    const bundleEmit = await bundle(
      new URL("file://figma-deno.ts", import.meta.url),
      {
        type: "classic",
        // deno-lint-ignore require-await
        async load(specifier) {
          if (specifier === "file://figma-deno.ts/") {
            const url = new URL(fileName, import.meta.url);
            const fakeUrl = new URL("./fake-padding.ts", import.meta.url);

            const content = `
              import { fake } from '${fakeUrl.href}';
              import setupFigmaScript from '${url.href}';
              
              async function runInFigma() {
                if (false === true) { fake() };
                  const figmaScriptResult = await setupFigmaScript.figmaScript();
                  
                  sendBackToDeno(figmaScriptResult);
                }
                runInFigma();
                `;

            return { kind: "module", specifier, content };
          }
          const result = cache.load(specifier);
          return result;
        },
      },
    );

    const { code } = bundleEmit;

    // Because we load into figma using a Function constructor
    // the sourcemap is slightly off.
    // To account for this we load in a fake file, and trim the start.
    // There's likely a better way to do this.
    const trimmedCode = code.substring(44);

    const result = await this.#connection.sendCodeToRun(trimmedCode);

    return result;
  }

  close() {
    this.#connection.endServer();
  }
}
