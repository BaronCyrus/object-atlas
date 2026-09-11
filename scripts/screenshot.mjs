import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE", msg.text());
});
page.on("pageerror", (e) => console.log("ERROR", e.message));
await page.goto("http://127.0.0.1:4173/");
await page.waitForTimeout(2000);
console.log(await page.evaluate(() => window.atlasDiagnostics()));
await page.screenshot({ path: "reports/desktop.png", fullPage: true });
for (const id of ["92fs", "1911"]) {
  await page.locator(`.exhibit-card[data-id="${id}"]`).click();
  await page.waitForFunction(
    (id) => window.atlasDiagnostics().model === id,
    id,
  );
  await page
    .locator("#viewer")
    .screenshot({ path: `reports/exhibit-${id}.png` });
}
await browser.close();
