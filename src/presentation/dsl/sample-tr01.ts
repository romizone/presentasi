import type { Presentation } from "./types";

/**
 * Canonical M0 sample. This is the single content source for web and PPTX.
 */
export const samplePresentation: Presentation = {
  dslVersion: "1.0.0",
  id: "m0-tr01-endpoint-discovery",
  title: "Endpoint asset discovery",
  styleId: "strategyConsulting",
  audience: "Technology and operations leadership",
  objective: "Align on moving from fragmented inventory to an authoritative discovery layer",
  slides: [
    {
      id: "slide-tr01-current-target",
      archetype: "TR-01",
      actionTitle:
        "Automated discovery establishes a single source of truth for endpoint assets",
      keyMessage: "Asset discovery becomes the authoritative ingestion layer.",
      content: {
        current: {
          title: "Current State",
          items: [
            "Manual asset discovery",
            "Fragmented inventory records",
            "Limited monitoring visibility",
          ],
        },
        transformation: {
          label: "Automate & Integrate",
        },
        target: {
          title: "Target State",
          items: [
            "Automatic asset discovery",
            "Continuous monitoring",
            "CMDB synchronization",
            "ITSM integration",
          ],
        },
        takeaway: "Asset discovery becomes the authoritative ingestion layer.",
      },
      visual: {
        type: "current-target-comparison",
        emphasis: "target",
      },
    },
  ],
};
