/// <reference types="https://raw.githubusercontent.com/figma/plugin-typings/master/index.d.ts" />
import chroma from "https://esm.sh/chroma-js@2.4.2?no-dts";

import { setupFigmaScript } from "../setupFigmaScript.ts";

export default setupFigmaScript({
  figmaScript() {
    // This plugin creates 5 rectangles on the screen.
    const numberOfRectangles = 5;

    const nodes: SceneNode[] = [];
    for (let index = 0; index < numberOfRectangles; index++) {
      const rect = figma.createRectangle();
      rect.x = index * 150;
      const color = chroma("green").darken(index / 2).rgb();
      rect.fills = [{
        type: "SOLID",
        color: { r: color[0] / 255, g: color[1] / 255, b: color[2] / 255 },
      }];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }
    figma.currentPage.selection = nodes;

    figma.viewport.scrollAndZoomIntoView(nodes);

    const pageText: string[] = [];
    figma.currentPage.findAll((node) => {
      if (node.type === "TEXT") {
        pageText.push(node.characters);
        return true;
      }
      return false;
    });
    debugger;

    return { pageText };
  },
});
