import { chromium } from "playwright";
import type { Deck } from "@/lib/schema";

export type ExportDeckPdfOptions = {
  /** Absolute URL to the print page, e.g. `${APP_URL}/deck/${id}/print`. */
  htmlUrl: string;
  /**
   * When set, injected into sessionStorage before navigation so the print
   * page can load the deck in a fresh Playwright context.
   */
  deck?: Deck;
  /** sessionStorage key id; defaults to a slug from the URL path. */
  deckId?: string;
};

function deckIdFromUrl(htmlUrl: string): string | undefined {
  try {
    const path = new URL(htmlUrl).pathname;
    const match = path.match(/\/deck\/([^/]+)\/print\/?$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

/**
 * Render a deck print URL to PDF via Playwright Chromium.
 *
 * Local / long-running Node works. Serverless hosts often lack Chromium
 * binaries and enough time/memory — keep `maxDuration` high and prefer a
 * dedicated worker in production.
 */
export async function exportDeckPdf(
  options: ExportDeckPdfOptions,
): Promise<Buffer> {
  const deckId = options.deckId ?? deckIdFromUrl(options.htmlUrl);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    if (options.deck && deckId) {
      const payload = JSON.stringify(options.deck);
      const key = `deck:${deckId}`;
      await page.addInitScript(
        ({ storageKey, json }) => {
          sessionStorage.setItem(storageKey, json);
        },
        { storageKey: key, json: payload },
      );
    }

    await page.goto(options.htmlUrl, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    await page.waitForFunction(() => document.fonts.ready);
    await page.waitForSelector('[data-df-ready="true"]', { timeout: 60_000 });

    const pdf = await page.pdf({
      landscape: true,
      width: "13.333in",
      height: "7.5in",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
