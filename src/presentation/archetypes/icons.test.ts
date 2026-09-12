import { describe, expect, it } from "vitest";
import { iconForItem } from "./icons";

describe("consulting icon mapping", () => {
  it("picks a food icon for nutrition copy", () => {
    expect(iconForItem("Menu bergizi terstandar", 0, "target")).toBe("utensils");
  });

  it("falls back deterministically by side and index", () => {
    expect(iconForItem("Something generic", 0, "current")).toBe("clipboard");
    expect(iconForItem("Something generic", 0, "target")).toBe("zap");
    expect(iconForItem("Something generic", 0, "current")).toBe("clipboard");
  });
});
