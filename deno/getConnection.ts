import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

const unhandledRuns: {
  runId: string;
  completeRun: ({ result }: { result: any }) => void;
}[] = [];

let runCount = 0;
function strartTrackingRun() {
  const runId = `run-${runCount++}`;
  let completeRun: ({ result }: { result: any }) => void;
  const runTracker = new Promise<any>((res) => {
    completeRun = ({ result }) => res(result);
  });
  unhandledRuns.push({
    runId,
    completeRun: completeRun!,
  });

  return {
    runId,
    runTracker,
  };
}

export async function getConnection({ fileKey }: { fileKey: string }) {
  const abortController = new AbortController();

  let setConnected: () => void;
  const connected = new Promise<void>((res) => {
    setConnected = () => res();
  });
  let sendCodeToRun: (
    msg: string,
  ) => Promise<any>;

  serve(
    // deno-lint-ignore require-await
    async (request) => {
      const url = new URL(request.url);

      const requestFileKey = url.searchParams.get("fileKey");

      if (requestFileKey !== fileKey) {
        return new Response("Unrelated file", { status: 400 });
      }

      // console.log(url.pathname);

      if (url.pathname === "/run-handled") {
        const handledRunId = url.searchParams.get("runId");
        const undhandledRunsIndex = unhandledRuns.findIndex(({ runId }) =>
          runId === handledRunId
        );

        const result = JSON.parse(
          decodeURIComponent(url.searchParams.get("result")!),
        ) as any;

        unhandledRuns[undhandledRunsIndex].completeRun({ result });
        unhandledRuns.splice(undhandledRunsIndex, 1);

        return new Response("completed", {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      if (url.pathname === "/listen") {
        setConnected();
        const body = new ReadableStream({
          start(controller) {
            sendCodeToRun = async (msg) => {
              const encodedCode = btoa(msg);
              const { runId, runTracker } = strartTrackingRun();
              const message = new TextEncoder().encode(
                `extra: figma.fileKey\nevent: codeToRun\ndata: ${encodedCode}\nid: ${runId}\r\n\r\n`,
              );
              controller.enqueue(message);

              const result = await runTracker;

              return result;
            };
          },
          cancel() {
          },
        });
        return new Response(body, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/event-stream",
          },
        });
      }

      return new Response("failed", { status: 500 });
    },
    { signal: abortController.signal },
  );

  await connected;

  return {
    sendCodeToRun: sendCodeToRun!,
    endServer() {
      abortController.abort();
    },
  };
}
