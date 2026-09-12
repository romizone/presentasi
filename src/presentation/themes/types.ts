export type ThemeColors = {
  background: string;
  ink: string;
  muted: string;
  rule: string;
  currentFill: string;
  currentAccent: string;
  targetFill: string;
  targetAccent: string;
  transformFill: string;
  transformOnFill: string;
  takeawayFill: string;
  takeawayAccent: string;
  footer: string;
  blob: string;
  blobDeep: string;
  iconOnAccent: string;
};

export type Theme = {
  id: "strategyConsulting";
  name: string;
  colors: ThemeColors;
  fonts: {
    pptx: string;
  };
};
