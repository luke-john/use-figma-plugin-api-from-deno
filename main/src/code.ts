function getHtml() {
  return `
<script>
  const evtSource = new EventSource("http://localhost:8000/listen?fileKey=${figma.fileKey}");

  evtSource.addEventListener("codeToRun", function(event) {
    console.log(event);
    const decodedCode = atob(event.data);
    const runId = event.lastEventId;
    parent.postMessage({ pluginMessage: { type: 'codeToRun', decodedCode, runId } }, "*");
  });


  onmessage = async function(event) {
    switch (event.data.pluginMessage.type) {
      case "main-handled-run": {
        const result = encodeURIComponent(JSON.stringify(event.data.pluginMessage.result))
        fetch(\`http://localhost:8000/run-handled?runId=\${event.data.pluginMessage.runId}&result=\${result}&fileKey=${figma.fileKey}\`)
        break
      }
    }
    
  }

</script>
<p>To use the debugger -- set Figma to "Use developer VM" and then open the developer tools: <kbd>Command</kbd> + <kbd>Option</kbd> + <kbd>i</kbd></p>
<p>See <a href="https://github.com/luke-john/use-figma-plugin-api-from-deno">https://github.com/luke-john/use-figma-plugin-api-from-deno</a> for more usage instructions.</p>
<pre><code>
// deno control file
import { getFigmaPluginConnection } from "https://raw.githubusercontent.com/luke-john/use-figma-plugin-api-from-deno/master/deno/figma-deno.ts";

const figmaPluginConnection = await getFigmaPluginConnection({
  fileKey: "${figma.fileKey}",
});
const figmaFileName = await figmaPluginConnection.run(\import\("./get-figma-file-name.ts"));
</code></pre>
<pre><code>
// ./get-figma-file-name.ts
// code that runs in figma (but returns to deno)
/// <reference types="https://raw.githubusercontent.com/figma/plugin-typings/master/index.d.ts" />
import chroma from "https://esm.sh/chroma-js@2.4.2?no-dts";

import { setupFigmaScript } from "https://raw.githubusercontent.com/luke-john/use-figma-plugin-api-from-deno/master/deno/setupFigmaScript.ts";

export default setupFigmaScript({
  // deno-lint-ignore require-await
  async figmaScript() {
    return figma.currentPage.name
  }
</code></pre>
`;
}

figma.showUI(getHtml(), { visible: true, width: 500, height: 300 });

console.log("started up");
figma.ui.onmessage = async (message) => {
  console.log("main received", message);

  try {
    if (message.type === "codeToRun") {
      const { decodedCode, runId } = message as {
        decodedCode: string;
        runId: string;
      };

      const figmaScript = Function("sendBackToDeno", decodedCode);
      let result;
      function sendBackToDeno(value: any) {
        result = value;
      }
      await figmaScript(sendBackToDeno);

      console.log("main received result", result);
      figma.ui.postMessage({ type: "main-handled-run", runId, result });

      return;
    }
  } catch (err) {
    // error handling
    console.error(err);
  }
};

// Runs this code if the plugin is run in Figma
if (figma.editorType === "figma") {
} else {
}

// figma.closePlugin();
