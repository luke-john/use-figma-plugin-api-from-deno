import { getFigmaPluginConnection } from "../figma-deno.ts";
const figmaPluginConnection = await getFigmaPluginConnection({
  fileKey: "VFPhi1erb9StHrWtazuSFS",
});
const result = await figmaPluginConnection.run(import("./figma-script.ts"));
console.log("completed", result);
figmaPluginConnection.close();
