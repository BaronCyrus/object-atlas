import { test, expect } from "@playwright/test";
const state = (page) => page.evaluate(() => window.atlasDiagnostics());
async function ready(page) {
  await page.goto("./");
  await expect(page.locator("#viewer")).toHaveAttribute("data-state", "ready", {
    timeout: 20000,
  });
}
const expected = [
  "slide",
  "barrel",
  "frame",
  "grip",
  "guard",
  "trigger",
  "front_sight",
  "rear_sight",
  "magazine",
  "controls",
  "rear",
].sort();

test("three rebuilt models load with eleven regions, materials, and valid previews", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  for (const id of ["g17", "92fs", "1911"]) {
    await page.locator(`.exhibit-card[data-id="${id}"]`).click();
    await expect
      .poll(async () => (await state(page)).model, { timeout: 20000 })
      .toBe(id);
    const s = await state(page);
    expect(s.groups.sort()).toEqual(expected);
    expect(s.sourceMeshes).toBeGreaterThan(40);
    expect(s.meshes).toBeLessThan(65);
    await expect(page.locator(".region-button")).toHaveCount(11);
  }
  expect(
    await page
      .locator(".card-image")
      .evaluateAll((imgs) =>
        imgs.every((i) => i.complete && i.naturalWidth >= 1000),
      ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("each visible-part card highlights its own meshes and plays the matching Chinese clip", async ({
  page,
}) => {
  await ready(page);
  for (const id of expected) {
    await page.locator(`.region-button[data-region="${id}"]`).click();
    expect((await state(page)).active).toBe(id);
    expect((await state(page)).highlighted).toBeGreaterThan(0);
    await expect
      .poll(async () => (await state(page)).audio.src || "")
      .toContain(`g17-${id}.mp3`);
    await expect(page.locator("#region-description")).not.toBeEmpty();
  }
});

test("raycast picks actual slide surface, and detached regions return to their base positions", async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-view="side"]').click();
  const dot = page.locator('.hotspot[data-region="slide"]');
  await dot.hover();
  const box = await dot.boundingBox();
  await page.mouse.click(box.x + 57, box.y + 14);
  await expect(page.locator("#region-name")).toHaveText("套筒");
  await page.locator("#explode").click();
  await expect
    .poll(async () => (await state(page)).positions.slide[1])
    .toBeGreaterThan(0.6);
  expect((await state(page)).positions.magazine[1]).toBeLessThan(-0.7);
  expect((await state(page)).positions.trigger[2]).toBeGreaterThan(0.4);
  await page.locator("#reset").click();
  await expect
    .poll(async () => Math.abs((await state(page)).positions.slide[1]))
    .toBeLessThan(0.015);
  await expect
    .poll(async () => Math.abs((await state(page)).positions.magazine[1]))
    .toBeLessThan(0.015);
  expect((await state(page)).active).toBe(null);
});

test("left, right, top and front are genuine orthographic views", async ({
  page,
}) => {
  await ready(page);
  const cameras = [];
  for (const view of ["side", "right", "top", "front"]) {
    await page.locator(`[data-view="${view}"]`).click();
    const s = await state(page);
    expect(s.projection).toBe("OrthographicCamera");
    cameras.push(s.camera.join(","));
  }
  expect(new Set(cameras).size).toBe(4);
  await page.locator('[data-view="perspective"]').click();
  expect((await state(page)).projection).toBe("PerspectiveCamera");
});

test("drag, wheel, keyboard and automatic rotation remain functional", async ({
  page,
}) => {
  await ready(page);
  const box = await page.locator("canvas").boundingBox();
  const before = (await state(page)).camera;
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.6 + 60,
    box.y + box.height * 0.65 + 10,
    { steps: 5 },
  );
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect((await state(page)).camera).not.toEqual(before);
  const dragged = (await state(page)).camera;
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(200);
  expect((await state(page)).camera).not.toEqual(dragged);
  await page.locator("canvas").focus();
  const keyboard = (await state(page)).camera;
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(100);
  expect((await state(page)).camera).not.toEqual(keyboard);
  await page.locator("#auto-rotate").click();
  const auto = (await state(page)).camera;
  await page.waitForTimeout(250);
  expect((await state(page)).camera).not.toEqual(auto);
  await page.locator("#reset").click();
  await expect(page.locator("#auto-rotate")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("slow illustrative animation shows a moving projectile and recoil, supports pause and reset", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#shoot").click();
  await expect(page.locator("#viewer")).toHaveAttribute(
    "data-animation",
    "playing",
  );
  await expect
    .poll(async () => (await state(page)).animation?.projectileVisible)
    .toBe(true);
  const a = (await state(page)).animation;
  expect(a.recoil).toBeGreaterThan(0);
  await page.waitForTimeout(250);
  expect((await state(page)).animation.projectile[0]).toBeLessThan(
    a.projectile[0],
  );
  await page.locator("#animation-pause").click();
  const paused = (await state(page)).animation.progress;
  await page.waitForTimeout(250);
  expect((await state(page)).animation.progress).toBe(paused);
  await expect(page.locator("#animation-pause")).toHaveText("继续动画");
  await page.locator("#animation-pause").click();
  await expect
    .poll(async () => (await state(page)).animation.progress)
    .toBeGreaterThan(paused);
  await page.locator("#reset").click();
  expect((await state(page)).animation).toBe(null);
  await expect(page.locator("#animation-caption")).toBeHidden();
});

test("switching models during an animation stops old motion and narration", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#shoot").click();
  await page.locator('.exhibit-card[data-id="92fs"]').click();
  await expect
    .poll(async () => (await state(page)).model, { timeout: 20000 })
    .toBe("92fs");
  expect((await state(page)).animation).toBe(null);
  await expect
    .poll(async () => (await state(page)).audio.src || "")
    .toContain("92fs-intro.mp3");
});

test("bundled narration plays without speechSynthesis and can pause, resume and change speed", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", { value: undefined }),
  );
  await ready(page);
  await page.locator('.region-button[data-region="grip"]').click();
  await expect
    .poll(async () => (await state(page)).audio.state, { timeout: 15000 })
    .toBe("speaking");
  await expect
    .poll(async () => (await state(page)).audio.currentTime)
    .toBeGreaterThan(0.05);
  expect((await state(page)).audio.duration).toBeGreaterThan(2);
  await page.locator("#pause").click();
  await expect(page.locator("#pause")).toHaveText("继续");
  const time = (await state(page)).audio.currentTime;
  await page.waitForTimeout(200);
  expect((await state(page)).audio.currentTime).toBeCloseTo(time, 1);
  await page.locator("#speech-rate").selectOption("0.8");
  expect((await state(page)).audio.rate).toBe(0.8);
  await page.locator("#pause").click();
  await expect
    .poll(async () => (await state(page)).audio.currentTime)
    .toBeGreaterThan(time);
  await page.locator("#stop").click();
  expect((await state(page)).audio.state).toBe("idle");
});

test("automatic narration can be disabled without disabling part selection", async ({
  page,
}) => {
  await ready(page);
  await page.locator("#auto-speech").uncheck();
  await page.locator('.region-button[data-region="barrel"]').click();
  expect((await state(page)).active).toBe("barrel");
  expect((await state(page)).audio.state).toBe("idle");
  await page.locator("#speak").click();
  await expect
    .poll(async () => (await state(page)).audio.state)
    .toBe("speaking");
});

test("audio failure shows a retry message and a second attempt works", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/audio/g17-grip.mp3*", (route) =>
    fail ? route.abort() : route.continue(),
  );
  await ready(page);
  await page.locator('.region-button[data-region="grip"]').click();
  await expect(page.locator("#speech-status")).toContainText("重试");
  fail = false;
  await page.locator("#speak").click();
  await expect
    .poll(async () => (await state(page)).audio.state, { timeout: 15000 })
    .toBe("speaking");
});

test("reference panel exposes citations and the Colt capacity conflict", async ({
  page,
}) => {
  await ready(page);
  await page.locator('.exhibit-card[data-id="1911"]').click();
  await page.getByRole("tab", { name: "型号资料" }).click();
  await expect(page.locator("#facts")).toContainText("官方字段冲突");
  await expect(page.locator("#source")).toHaveAttribute("href", /colt.com/);
  await page.locator("#about-open").click();
  await expect(page.locator("dialog")).toContainText(
    "后两款未取得可靠完整三视图",
  );
  await expect(page.locator("#all-sources a")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toBeHidden();
});

test("old physics and quiz content is removed; Chinese search and empty results work", async ({
  page,
}) => {
  await ready(page);
  await expect(
    page.locator("#lab,#safety,#quiz-options,#run-experiment"),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("小车");
  await page.getByRole("searchbox").fill("柯尔特");
  await expect(page.locator(".exhibit-card:visible")).toHaveCount(1);
  await page.getByRole("searchbox").fill("没有这个");
  await expect(page.locator("#no-results")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await expect(page.locator(".exhibit-card:visible")).toHaveCount(3);
});

test("model request failure supports retry and keeps the narration controls", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/models/g17.glb*", (route) =>
    fail ? route.abort() : route.continue(),
  );
  await page.goto("./");
  await expect(page.locator("#viewer")).toHaveAttribute("data-state", "error");
  await expect(page.locator(".region-button")).toHaveCount(11);
  fail = false;
  await page.locator("#load-state").click();
  await expect(page.locator("#viewer")).toHaveAttribute("data-state", "ready", {
    timeout: 20000,
  });
});

test("the static model stops redrawing and highlighting wakes it", async ({
  page,
}) => {
  await ready(page);
  await page.waitForTimeout(450);
  const before = (await state(page)).frames;
  await page.waitForTimeout(350);
  expect((await state(page)).frames).toBe(before);
  await page.locator('.region-button[data-region="slide"]').click();
  await expect
    .poll(async () => (await state(page)).frames)
    .toBeGreaterThan(before);
});
for (const width of [390, 768])
  test(`responsive ${width}px fits and supports narrated parts and motion controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('.exhibit-card[data-id="1911"]').click();
    await expect
      .poll(async () => (await state(page)).model, { timeout: 20000 })
      .toBe("1911");
    await page.locator('.region-button[data-region="rear"]').click();
    await expect(page.locator("#region-name")).toHaveText("击锤外形");
    await page.locator("#reset").click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `reports/v2/mobile-${width}.png`,
      fullPage: true,
    });
  });
