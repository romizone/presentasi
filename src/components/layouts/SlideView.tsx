import type { ComponentType } from "react";
import type { Slide, StyleId } from "@/lib/schema";
import { BigNumber } from "./BigNumber";
import { ChartLeft } from "./ChartLeft";
import { FullChart } from "./FullChart";
import { Quote } from "./Quote";
import { SectionBreak } from "./SectionBreak";
import { ThreeColumn } from "./ThreeColumn";
import type { LayoutProps } from "./SlideShell";

const LAYOUTS: Record<Slide["layout"], ComponentType<LayoutProps>> = {
  chart_left: ChartLeft,
  full_chart: FullChart,
  three_column: ThreeColumn,
  quote: Quote,
  big_number: BigNumber,
  section_break: SectionBreak,
};

export type SlideViewProps = {
  slide: Slide;
  styleId: StyleId;
  chartSvg?: string;
};

export function SlideView({ slide, styleId, chartSvg }: SlideViewProps) {
  const Layout = LAYOUTS[slide.layout];
  return <Layout slide={slide} styleId={styleId} chartSvg={chartSvg} />;
}
