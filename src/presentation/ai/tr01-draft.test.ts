import { describe, expect, it } from "vitest";
import { parseJsonObject, parseTr01Draft, presentationFromDraft } from "./tr01-draft";
import { validatePresentation } from "../dsl/validate";

describe("TR-01 draft parsing", () => {
  const sample = {
    actionTitle: "MBG menjangkau siswa dengan menu bergizi setiap hari sekolah",
    keyMessage: "Distribusi terpusat menjamin gizi merata.",
    content: {
      current: {
        title: "Kondisi saat ini",
        items: ["Menu tidak standar", "Rantai pasok terpecah", "Pemantauan lemah"],
      },
      transformation: { label: "Standarisasi & Salur" },
      target: {
        title: "Kondisi sasaran",
        items: [
          "Menu bergizi terstandar",
          "Dapur terhubung sekolah",
          "Pemantauan harian",
          "Umpan balik orang tua",
        ],
      },
      takeaway: "MBG menjadi saluran gizi harian yang terukur.",
    },
  };

  it("accepts semantic JSON and rejects it going through layout validation", () => {
    const draft = parseTr01Draft(sample);
    const presentation = presentationFromDraft(draft, "slide tentang MBG");
    expect(validatePresentation(presentation).slides[0]?.actionTitle).toContain("MBG");
    expect(presentation.slides[0]?.content.current.items).toHaveLength(3);
  });

  it("parses fenced JSON", () => {
    const parsed = parseJsonObject("```json\n{\"actionTitle\":\"A\"}\n```");
    expect(parsed).toEqual({ actionTitle: "A" });
  });

  it("extracts JSON when the model wraps it in prose", () => {
    const parsed = parseJsonObject('Here you go:\n{"actionTitle":"MBG merata"}\nThanks');
    expect(parsed).toEqual({ actionTitle: "MBG merata" });
  });
});
