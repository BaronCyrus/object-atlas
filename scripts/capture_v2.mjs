import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(process.env.SITE_URL || "http://127.0.0.1:4173/");
await page.waitForFunction(() => window.atlasDiagnostics?.().ready);
await page.screenshot({ path: "reports/v2/desktop.png", fullPage: true });
for (const id of ["g17", "92fs", "1911"]) {
  await page.locator(`.exhibit-card[data-id="${id}"]`).click();
  await page.waitForFunction(
    (id) => window.atlasDiagnostics().model === id,
    id,
  );
  await page.locator("#stop").click();
  await page.locator("#viewer").screenshot({ path: `reports/v2/${id}.png` });
  await page.locator("#explode").click();
  await page.waitForTimeout(750);
  await page
    .locator("#viewer")
    .screenshot({ path: `reports/v2/${id}-parts.png` });
  await page.locator("#reset").click();
}
await page.locator('.exhibit-card[data-id="g17"]').click();
await page.waitForFunction(() => window.atlasDiagnostics().model === "g17");
await page.locator("#shoot").click();
await page.waitForFunction(
  () => window.atlasDiagnostics().animation?.progress > 0.28,
);
await page.locator("#animation-pause").click();
await page.locator("#viewer").screenshot({ path: "reports/v2/motion.png" });
console.log(
  JSON.stringify(
    {
      errors,
      diagnostics: await page.evaluate(() => window.atlasDiagnostics()),
    },
    null,
    2,
  ),
);
await browser.close();
