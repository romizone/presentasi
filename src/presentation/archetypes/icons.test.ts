import { describe, expect, it } from "vitest";
import { iconForCard, iconForItem } from "./icons";

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

describe("keyword matching respects word boundaries", () => {
  it("does not read 'menu' out of the middle of another word", () => {
    // "menunjukkan" and "penurunan" both contain the letters of "menu".
    expect(
      iconForItem("Skrining menunjukkan penurunan prevalensi anemia", 0, "target"),
    ).not.toBe("utensils");
  });

  it("does not read 'aman' out of 'keamanan'", () => {
    // Substring matching sent this to the "aman" rule (check) instead.
    expect(iconForItem("Keamanan sistem", 0, "target")).toBe("shield");
  });

  it("resolves a tie by rule order, not by which word appears first", () => {
    // "pelanggan" (users) is declared before "keamanan" (shield).
    expect(iconForItem("Keamanan data pelanggan", 0, "target")).toBe("users");
  });

  it("still matches a genuine whole word", () => {
    expect(iconForItem("Menu harian terstandar", 0, "target")).toBe("utensils");
  });

  it("still matches a stem that continues", () => {
    expect(iconForItem("Monitoring berkelanjutan", 0, "target")).toBe("eye");
  });
});

describe("iconForCard hint priority", () => {
  it("lets an explicit hint outrank words in the body", () => {
    expect(
      iconForCard(
        0,
        "kesehatan",
        "Angka anemia turun",
        "Skrining ulang menunjukkan penurunan prevalensi anemia ringan.",
      ),
    ).toBe("heart");
  });

  it("falls through to the heading when there is no hint", () => {
    expect(iconForCard(0, undefined, "Keterlibatan orang tua", "Sesi bulanan.")).toBe(
      "users",
    );
  });

  it("falls through to the body when neither hint nor heading matches", () => {
    expect(iconForCard(0, undefined, "Pilar tiga", "Sinkronisasi CMDB harian.")).toBe(
      "link",
    );
  });

  it("falls back deterministically when nothing matches", () => {
    expect(iconForCard(0, undefined, "Alpha", "Beta")).toBe("lightbulb");
    expect(iconForCard(1, undefined, "Alpha", "Beta")).toBe("layers");
    expect(iconForCard(0, undefined, "Alpha", "Beta")).toBe("lightbulb");
  });
});
