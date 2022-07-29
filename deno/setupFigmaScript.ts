export function setupFigmaScript<
  FigmaScriptParams extends any[],
  FigmaScriptResult,
>(
  { figmaScript }: {
    figmaScript: (
      ...params: FigmaScriptParams
    ) => FigmaScriptResult;
  },
) {
  const error = new Error();

  const lastStackLine = error.stack!.substring(error.stack!.lastIndexOf("\n"));
  const fileName = lastStackLine.slice(8, -5);

  return {
    fileName,
    figmaScript,
  };
}
