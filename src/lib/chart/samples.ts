import type { ChartSpec, ChartType } from "@/lib/schema";

/** One sample ChartSpec per type for gallery / smoke rendering. */
export const CHART_SAMPLES: Record<ChartType, ChartSpec> = {
  bar_h: {
    type: "bar_h",
    unit: "%",
    callout: "Latency share now dominates",
    calloutTarget: "Network",
    source: "Internal SRE weekly latency report, 2025-Q4",
    data: [
      { label: "Compute", value: 22 },
      { label: "Storage", value: 18 },
      { label: "Network", value: 41 },
      { label: "Other", value: 19 },
    ],
  },
  bar_v: {
    type: "bar_v",
    unit: "IDR bn",
    callout: "Peak quarter",
    calloutTarget: "Q3",
    source: "Company finance pack, FY2025 board pack p.12",
    data: [
      { label: "Q1", value: 12 },
      { label: "Q2", value: 15 },
      { label: "Q3", value: 21 },
      { label: "Q4", value: 18 },
    ],
  },
  line: {
    type: "line",
    unit: "index",
    callout: "Inflection after launch",
    calloutTarget: "Jun",
    source: "Product analytics export, weekly active users index",
    data: [
      { label: "Jan", value: 100 },
      { label: "Feb", value: 104 },
      { label: "Mar", value: 109 },
      { label: "Apr", value: 111 },
      { label: "May", value: 118 },
      { label: "Jun", value: 132 },
    ],
  },
  stacked_bar: {
    type: "stacked_bar",
    unit: "share %",
    source: "Channel mix study, marketing ops dashboard 2025-11",
    data: [
      { label: "Organic", value: 40, series: "Direct" },
      { label: "Organic", value: 25, series: "Referral" },
      { label: "Paid", value: 20, series: "Direct" },
      { label: "Paid", value: 15, series: "Referral" },
    ],
  },
  waterfall: {
    type: "waterfall",
    unit: "pp",
    source: "Margin bridge, FP&A monthly close 2025-10",
    data: [
      { label: "Start", value: 18, series: "total" },
      { label: "Price", value: 3 },
      { label: "Volume", value: 2 },
      { label: "Cost", value: -4 },
      { label: "End", value: 19, series: "total" },
    ],
  },
  scatter: {
    type: "scatter",
    unit: "NPS",
    callout: "Outlier segment",
    calloutTarget: "Enterprise",
    source: "Customer satisfaction survey wave 7, n=1,204",
    data: [
      { label: "SMB", value: 32, series: "Segment" },
      { label: "Mid-market", value: 41, series: "Segment" },
      { label: "Enterprise", value: 58, series: "Segment" },
      { label: "Public", value: 27, series: "Segment" },
    ],
  },
  big_number: {
    type: "big_number",
    unit: "%",
    callout: "Year-over-year improvement",
    source: "Ops KPI scorecard, week 48",
    data: [{ label: "On-time delivery", value: 94 }],
  },
  none: {
    type: "none",
    source: "Narrative-only slide; no quantitative chart",
    data: [],
  },
};
