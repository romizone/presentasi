import { describe, expect, it } from "vitest";
import {
  ACCEPTED_EXTENSIONS,
  isAcceptedFile,
  kindOf,
  validateIncomingFiles,
} from "./files";

function file(name: string): File {
  return new File(["hello"], name, { type: "application/octet-stream" });
}

describe("source material files", () => {
  it("accepts common briefing formats", () => {
    for (const ext of [".pdf", ".pptx", ".docx", ".xlsx", ".txt", ".md", ".csv", ".png"]) {
      expect(isAcceptedFile(file(`brief${ext}`)), ext).toBe(true);
    }
  });

  it("rejects unknown formats", () => {
    expect(isAcceptedFile(file("malware.exe"))).toBe(false);
    expect(isAcceptedFile(file("archive.zip"))).toBe(false);
  });

  it("classifies file kinds", () => {
    expect(kindOf("deck.pptx", "")).toBe("presentation");
    expect(kindOf("notes.pdf", "application/pdf")).toBe("pdf");
    expect(kindOf("photo.png", "image/png")).toBe("image");
    expect(kindOf("model.xlsx", "")).toBe("spreadsheet");
  });

  it("enforces size and count", () => {
    const tooBig = new File(["x".repeat(10)], "big.pdf");
    Object.defineProperty(tooBig, "size", { value: 26 * 1024 * 1024 });
    expect(validateIncomingFiles([tooBig], 0).error).toMatch(/25 MB/);
    expect(validateIncomingFiles([file("a.pdf")], 12).error).toMatch(/Maksimal/);
  });

  it("lists an extension set for the file picker", () => {
    expect(ACCEPTED_EXTENSIONS.length).toBeGreaterThan(8);
  });
});
