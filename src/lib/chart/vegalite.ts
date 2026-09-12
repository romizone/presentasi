import { parse, View } from "vega";
import { compile, type TopLevelSpec } from "vega-lite";
import type { ChartSpec } from "@/lib/schema";
import { STYLES, type StyleId } from "@/lib/styles";

type ChartRow = {
  label: string;
  value: number;
  series: string;
};

type WaterfallRow = {
  label: string;
  value: number;
  start: number;
  end: number;
  kind: "increase" | "decrease" | "total";
};

const WIDTH = 640;
const HEIGHT = 360;

function palette(styleId: StyleId): string[] {
  return STYLES[styleId].tokens.palette;
}

function sortData(spec: ChartSpec, styleId: StyleId): ChartRow[] {
  const rows: ChartRow[] = spec.data.map((d) => ({
    label: d.label,
    value: d.value,
    series: d.series ?? "default",
  }));
  if (STYLES[styleId].charts.sortDescending) {
    return [...rows].sort((a, b) => b.value - a.value);
  }
  return rows;
}

function axisGrid(styleId: StyleId): {
  xGrid: boolean;
  yGrid: boolean;
} {
  const grid = STYLES[styleId].charts.gridlines;
  if (grid === false || grid === undefined) return { xGrid: false, yGrid: false };
  if (grid === "horizontal-only") return { xGrid: false, yGrid: true };
  if (grid === true) return { xGrid: true, yGrid: true };
  return { xGrid: false, yGrid: false };
}

function dataLabels(styleId: StyleId): boolean {
  return STYLES[styleId].charts.dataLabels ?? false;
}

function baseConfig(styleId: StyleId): TopLevelSpec["config"] {
  const tokens = STYLES[styleId].tokens;
  const muted = tokens.muted ?? "#5A6B7B";
  return {
    background: "transparent",
    font: tokens.font,
    axis: {
      labelColor: muted,
      titleColor: muted,
      domainColor: muted,
      tickColor: muted,
      labelFontSize: 11,
      titleFontSize: 12,
    },
    legend: {
      labelColor: muted,
      titleColor: muted,
    },
    view: { stroke: null },
  };
}

function withCallout(
  layers: TopLevelSpec[],
  spec: ChartSpec,
  styleId: StyleId,
  orient: "h" | "v",
): TopLevelSpec {
  if (!spec.callout || !spec.calloutTarget) {
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v6.json",
      width: WIDTH,
      height: HEIGHT,
      config: baseConfig(styleId),
      layer: layers as never,
    };
  }

  const target = sortData(spec, styleId).find(
    (row) => row.label === spec.calloutTarget,
  );
  if (!target) {
    return {
      $schema: "https://vega.github.io/schema/vega-lite/v6.json",
      width: WIDTH,
      height: HEIGHT,
      config: baseConfig(styleId),
      layer: layers as never,
    };
  }

  const calloutLayer: TopLevelSpec = {
    data: {
      values: [
        {
          label: target.label,
          value: target.value,
          note: spec.callout,
        },
      ],
    },
    mark: {
      type: "text",
      align: orient === "h" ? "left" : "center",
      baseline: orient === "h" ? "middle" : "bottom",
      dx: orient === "h" ? 8 : 0,
      dy: orient === "h" ? 0 : -10,
      fontSize: 12,
      fontWeight: 600,
      color: STYLES[styleId].tokens.accent ?? palette(styleId)[0],
    },
    encoding: {
      x:
        orient === "h"
          ? { field: "value", type: "quantitative" }
          : { field: "label", type: "nominal" },
      y:
        orient === "h"
          ? { field: "label", type: "nominal" }
          : { field: "value", type: "quantitative" },
      text: { field: "note", type: "nominal" },
    },
  };

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: WIDTH,
    height: HEIGHT,
    config: baseConfig(styleId),
    layer: [...layers, calloutLayer] as never,
  };
}

function barHorizontal(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = sortData(spec, styleId);
  const showLabels = dataLabels(styleId);

  const barLayer: TopLevelSpec = {
    data: { values: rows },
    mark: { type: "bar", cornerRadiusEnd: 2 },
    encoding: {
      y: {
        field: "label",
        type: "nominal",
        sort: rows.map((r) => r.label),
        axis: { title: null, grid: yGrid },
      },
      x: {
        field: "value",
        type: "quantitative",
        axis: {
          title: spec.unit ?? null,
          grid: xGrid,
        },
      },
      color: {
        field: "series",
        type: "nominal",
        scale: { range: colors },
        legend: rows.some((r) => r.series !== "default") ? {} : null,
      },
    },
  };

  const layers: TopLevelSpec[] = [barLayer];
  if (showLabels) {
    layers.push({
      data: { values: rows },
      mark: {
        type: "text",
        align: "left",
        baseline: "middle",
        dx: 4,
        fontSize: 11,
      },
      encoding: {
        y: {
          field: "label",
          type: "nominal",
          sort: rows.map((r) => r.label),
        },
        x: { field: "value", type: "quantitative" },
        text: { field: "value", type: "quantitative" },
      },
    });
  }

  return withCallout(layers, spec, styleId, "h");
}

function barVertical(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = sortData(spec, styleId);
  const showLabels = dataLabels(styleId);

  const barLayer: TopLevelSpec = {
    data: { values: rows },
    mark: { type: "bar", cornerRadiusEnd: 2 },
    encoding: {
      x: {
        field: "label",
        type: "nominal",
        sort: rows.map((r) => r.label),
        axis: { title: null, grid: xGrid, labelAngle: -30 },
      },
      y: {
        field: "value",
        type: "quantitative",
        axis: {
          title: spec.unit ?? null,
          grid: yGrid,
        },
      },
      color: {
        field: "series",
        type: "nominal",
        scale: { range: colors },
        legend: rows.some((r) => r.series !== "default") ? {} : null,
      },
    },
  };

  const layers: TopLevelSpec[] = [barLayer];
  if (showLabels) {
    layers.push({
      data: { values: rows },
      mark: {
        type: "text",
        align: "center",
        baseline: "bottom",
        dy: -4,
        fontSize: 11,
      },
      encoding: {
        x: {
          field: "label",
          type: "nominal",
          sort: rows.map((r) => r.label),
        },
        y: { field: "value", type: "quantitative" },
        text: { field: "value", type: "quantitative" },
      },
    });
  }

  return withCallout(layers, spec, styleId, "v");
}

function lineChart(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = sortData(spec, styleId).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );

  const layers: TopLevelSpec[] = [
    {
      data: { values: rows },
      mark: { type: "line", point: true, strokeWidth: 2 },
      encoding: {
        x: {
          field: "label",
          type: "ordinal",
          sort: rows.map((r) => r.label),
          axis: { title: null, grid: xGrid },
        },
        y: {
          field: "value",
          type: "quantitative",
          axis: { title: spec.unit ?? null, grid: yGrid },
        },
        color: {
          field: "series",
          type: "nominal",
          scale: { range: colors },
        },
      },
    },
  ];

  if (dataLabels(styleId)) {
    layers.push({
      data: { values: rows },
      mark: { type: "text", dy: -8, fontSize: 11 },
      encoding: {
        x: {
          field: "label",
          type: "ordinal",
          sort: rows.map((r) => r.label),
        },
        y: { field: "value", type: "quantitative" },
        text: { field: "value", type: "quantitative" },
      },
    });
  }

  return withCallout(layers, spec, styleId, "v");
}

function stackedBar(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = sortData(spec, styleId);

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: WIDTH,
    height: HEIGHT,
    config: baseConfig(styleId),
    data: { values: rows },
    mark: { type: "bar" },
    encoding: {
      x: {
        field: "label",
        type: "nominal",
        axis: { title: null, grid: xGrid, labelAngle: -30 },
      },
      y: {
        field: "value",
        type: "quantitative",
        stack: "zero",
        axis: { title: spec.unit ?? null, grid: yGrid },
      },
      color: {
        field: "series",
        type: "nominal",
        scale: { range: colors },
      },
    },
  };
}

function toWaterfallRows(spec: ChartSpec): WaterfallRow[] {
  let running = 0;
  const rows: WaterfallRow[] = [];
  for (const point of spec.data) {
    const start = running;
    const end = running + point.value;
    const kind: WaterfallRow["kind"] =
      point.series === "total"
        ? "total"
        : point.value >= 0
          ? "increase"
          : "decrease";
    rows.push({
      label: point.label,
      value: point.value,
      start: kind === "total" ? 0 : Math.min(start, end),
      end: kind === "total" ? point.value : Math.max(start, end),
      kind,
    });
    if (kind !== "total") {
      running = end;
    } else {
      running = point.value;
    }
  }
  return rows;
}

/** Approximate waterfall using floating bars (base → value). */
function waterfallChart(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = toWaterfallRows(spec);
  const colorDomain = ["increase", "decrease", "total"];
  const colorRange = [
    colors[0] ?? "#0B3C5D",
    colors[2] ?? "#D9B310",
    colors[1] ?? "#328CC1",
  ];

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: WIDTH,
    height: HEIGHT,
    config: baseConfig(styleId),
    data: { values: rows },
    mark: { type: "bar" },
    encoding: {
      x: {
        field: "label",
        type: "nominal",
        sort: rows.map((r) => r.label),
        axis: { title: null, grid: xGrid, labelAngle: -30 },
      },
      y: {
        field: "start",
        type: "quantitative",
        axis: { title: spec.unit ?? null, grid: yGrid },
      },
      y2: { field: "end" },
      color: {
        field: "kind",
        type: "nominal",
        scale: { domain: colorDomain, range: colorRange },
      },
    },
  };
}

function scatterChart(spec: ChartSpec, styleId: StyleId): TopLevelSpec {
  const { xGrid, yGrid } = axisGrid(styleId);
  const colors = palette(styleId);
  const rows = sortData(spec, styleId).map((row, index) => ({
    ...row,
    x: index + 1,
  }));

  const layers: TopLevelSpec[] = [
    {
      data: { values: rows },
      mark: { type: "point", filled: true, size: 80 },
      encoding: {
        x: {
          field: "x",
          type: "quantitative",
          title: null,
          axis: { grid: xGrid, labels: false, ticks: false },
        },
        y: {
          field: "value",
          type: "quantitative",
          axis: { title: spec.unit ?? null, grid: yGrid },
        },
        color: {
          field: "series",
          type: "nominal",
          scale: { range: colors },
        },
        tooltip: [
          { field: "label", type: "nominal" },
          { field: "value", type: "quantitative" },
        ],
      },
    },
  ];

  if (dataLabels(styleId)) {
    layers.push({
      data: { values: rows },
      mark: { type: "text", dy: -10, fontSize: 10 },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "value", type: "quantitative" },
        text: { field: "label", type: "nominal" },
      },
    });
  }

  return withCallout(layers, spec, styleId, "v");
}

function bigNumberSvg(spec: ChartSpec, styleId: StyleId): string {
  const tokens = STYLES[styleId].tokens;
  const primary = spec.data[0];
  const value = primary?.value ?? 0;
  const label = primary?.label ?? "";
  const unit = spec.unit ? ` ${spec.unit}` : "";
  const accent = tokens.accent ?? palette(styleId)[0] ?? "#0B3C5D";
  const muted = tokens.muted ?? "#5A6B7B";
  const scale = tokens.numeralScale ?? 1;
  const fontSize = Math.round(72 * Math.min(scale, 2));

  const callout =
    spec.callout != null && spec.callout.length > 0
      ? `<text x="320" y="280" text-anchor="middle" font-family="${tokens.font}" font-size="14" fill="${muted}">${escapeXml(spec.callout)}</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <text x="320" y="160" text-anchor="middle" font-family="${tokens.font}" font-size="${fontSize}" font-weight="700" fill="${accent}">${escapeXml(String(value))}${escapeXml(unit)}</text>
  <text x="320" y="220" text-anchor="middle" font-family="${tokens.font}" font-size="18" fill="${muted}">${escapeXml(label)}</text>
  ${callout}
</svg>`;
}

function emptySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"></svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function chartSpecToVegaLite(
  spec: ChartSpec,
  styleId: StyleId,
): TopLevelSpec {
  switch (spec.type) {
    case "bar_h":
      return barHorizontal(spec, styleId);
    case "bar_v":
      return barVertical(spec, styleId);
    case "line":
      return lineChart(spec, styleId);
    case "stacked_bar":
      return stackedBar(spec, styleId);
    case "waterfall":
      return waterfallChart(spec, styleId);
    case "scatter":
      return scatterChart(spec, styleId);
    case "big_number":
      return {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        width: WIDTH,
        height: HEIGHT,
        data: { values: spec.data },
        mark: { type: "text", fontSize: 48, fontWeight: 700 },
        encoding: {
          text: { field: "value", type: "quantitative" },
        },
        config: baseConfig(styleId),
      };
    case "none":
      return {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        width: WIDTH,
        height: HEIGHT,
        data: { values: [] },
        mark: "point",
        encoding: {},
        config: baseConfig(styleId),
      };
    default: {
      const _exhaustive: never = spec.type;
      throw new Error(`Unsupported chart type: ${String(_exhaustive)}`);
    }
  }
}

export async function renderChartSvg(
  spec: ChartSpec,
  styleId: StyleId,
): Promise<string> {
  if (spec.type === "none") {
    return emptySvg();
  }
  if (spec.type === "big_number") {
    return bigNumberSvg(spec, styleId);
  }

  const vlSpec = chartSpecToVegaLite(spec, styleId);
  const compiled = compile(vlSpec);
  const view = new View(parse(compiled.spec), { renderer: "none" });
  await view.runAsync();
  return view.toSVG();
}
