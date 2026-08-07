import { pipe } from "niall-utils";
import { dom } from "niall-utils/ui";
import { Vector } from "vectyped";

import type { Config } from "./config.ts";
import { decomposeSvg } from "./decomposeSvg.ts";
import { epicycleChain, toEpicycles, type Epicycle } from "./epicycle.ts";
import { appMethods, type StatefulAppContext } from "./lib/index.ts";
import { safeAt } from "./safeAt.ts";

interface State {
  epicycles: Epicycle[];
  scale: number;
}

const animationFrame = (appCtx: StatefulAppContext<Config, State>): void => {
  const { canvas, ctx, time, getState, seriform } = appCtx;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const period = seriform.getValue("period");
  const traceSteps = seriform.getValue("trace-steps");

  const t = 1 - Math.abs((((time.now - time.start) / period) % 2) - 1);
  const { epicycles, scale } = getState();
  const chain = epicycleChain(epicycles, t);

  ctx.strokeStyle = "#444";
  for (const [i, { amp }] of epicycles.entries()) {
    const centre = safeAt(chain, i);
    ctx.beginPath();
    ctx.arc(
      centre.x() * scale,
      centre.y() * scale,
      amp * scale,
      0,
      2 * Math.PI
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "#888";
  ctx.beginPath();
  for (const [i, vec] of chain.entries()) {
    ctx[i === 0 ? "moveTo" : "lineTo"](vec.x() * scale, vec.y() * scale);
  }
  ctx.stroke();

  ctx.strokeStyle = "white";
  ctx.beginPath();
  for (let i = 0; i <= Math.floor(t * traceSteps); i++) {
    const tip = safeAt(epicycleChain(epicycles, i / traceSteps), -1);
    ctx[i === 0 ? "moveTo" : "lineTo"](tip.x() * scale, tip.y() * scale);
  }
  ctx.stroke();
};

const svgToState = (
  svgText: string,
  samplePwr2: number,
  dimensions: Vector<2>
): State => {
  const svgEl = dom.toHtml(svgText) as unknown as SVGSVGElement;
  const epicycles = toEpicycles(decomposeSvg(svgEl, 2 ** samplePwr2));
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    position: absolute;
    visibility: hidden;
    top: -9999px;
    left: -9999px;
    width: auto;
    height: auto;
  `;

  wrapper.appendChild(svgEl);
  document.body.appendChild(wrapper);
  const bbox = [...svgEl.querySelectorAll("path")].reduce(
    ({ tl, br }, pathEl) =>
      pipe(pathEl.getBBox(), b => ({
        tl: tl.min(Vector.create(b.x, b.y)),
        br: br.max(Vector.create(b.x + b.width, b.y + b.height)),
      })),
    { tl: Vector.fill(2, Infinity), br: Vector.fill(2, -Infinity) }
  );
  const bboxSize = bbox.br.copy().sub(bbox.tl);
  wrapper.remove();

  return {
    epicycles,
    scale: dimensions.copy().divide(bboxSize).getMin(),
  };
};

export const app = appMethods<Config, State>({
  init: ({ seriform, canvas }) =>
    svgToState(
      seriform.getValue("svg"),
      seriform.getValue("sample-power"),
      Vector.create(canvas.width, canvas.height)
    ),
  postInit: ({ seriform, canvas, setState }) => {
    seriform.addListener(({ svg: svgText, "sample-power": samplePwr2 }) => {
      setState(
        svgToState(
          svgText,
          samplePwr2,
          Vector.create(canvas.width, canvas.height)
        )
      );
    });
  },
  onResize: (_, { seriform, canvas, setState }) => {
    setState(
      svgToState(
        seriform.getValue("svg"),
        seriform.getValue("sample-power"),
        Vector.create(canvas.width, canvas.height)
      )
    );
  },
  animationFrame,
});
