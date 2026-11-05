import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
const source = path.resolve("packages/gen12-vessel-study/assets/vessel.glb");
async function ready(page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "An illustrative travel vessel",
      exact: true,
    }),
  ).toBeVisible();
}
for (const width of [1440, 390, 320])
  test(`model, controls, keyboard and reflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ready(page);
    const start = page.getByRole("button", {
      name: "Start 3D preview",
      exact: true,
    });
    await start.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("Model ready");
    await expect(page.locator("canvas")).toHaveCount(1);
    for (const name of [
      "Side profile",
      "Opening",
      "Rotate left",
      "Zoom in",
      "Reset view",
    ]) {
      const b = page.getByRole("button", { name, exact: true });
      await b.focus();
      await page.keyboard.press("Enter");
    }
    const hotspot = page.getByRole("button", {
      name: "What is imagined",
      exact: true,
    });
    await hotspot.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#detail")).toContainText("artistic choices");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(errors).toEqual([]);
  });
test("no WebGL preserves complete descriptions and retry control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type, ...args);
    };
  });
  await ready(page);
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "descriptions remain available",
  );
  await expect(
    page.getByRole("button", { name: "Retry preview" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "The passage connection", exact: true })
    .click();
  await expect(page.locator("#detail")).toContainText("Genesis 12:5");
});
test("failed model request retries once without duplicate canvas", async ({
  page,
}) => {
  await ready(page);
  await page.route("**/assets/vessel.glb", (route) => route.abort(), {
    times: 1,
  });
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry preview" }).click();
  await expect(page.getByRole("status")).toContainText("Model ready");
  await expect(page.locator("canvas")).toHaveCount(1);
});
test("local model is never uploaded; corrupt model fails visibly", async ({
  page,
}) => {
  const outgoing = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173")) outgoing.push(r.url());
  });
  await ready(page);
  await page.locator("#model-file").setInputFiles(source);
  await expect(
    page.getByRole("heading", { name: "vessel.glb", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Model ready");
  await page.locator("#model-file").setInputFiles({
    name: "broken.glb",
    mimeType: "model/gltf-binary",
    buffer: Buffer.from("not a model"),
  });
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("GLB size");
  expect(outgoing).toEqual([]);
});

test("embedded textures decode under CSP; corrupt image cannot report success", async ({
  page,
}) => {
  const { texturedFixture } = await import("../fixture-model.mjs");
  const fs = await import("node:fs/promises");
  const original = await fs.readFile(source);
  await ready(page);
  await page
    .locator("#model-file")
    .setInputFiles({
      name: "textured.glb",
      mimeType: "model/gltf-binary",
      buffer: texturedFixture(original),
    });
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Model ready");
  await expect(page.locator("#metrics")).toContainText("1 decoded textures");
  await page
    .locator("#model-file")
    .setInputFiles({
      name: "bad-texture.glb",
      mimeType: "model/gltf-binary",
      buffer: texturedFixture(original, true),
    });
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Embedded texture failed",
  );
});
test("an old failed model request cannot erase a newer local selection", async ({
  page,
}) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  let seen;
  const requested = new Promise((resolve) => (seen = resolve));
  await ready(page);
  await page.route(
    "**/assets/vessel.glb",
    async (route) => {
      seen();
      await held;
      await route.abort();
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await requested;
  await page.locator("#model-file").setInputFiles(source);
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Model ready");
  const failed = page.waitForEvent("requestfailed", request => request.url().endsWith("/assets/vessel.glb"));
  release();
  await failed;
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 50)));
  await expect(
    page.getByRole("heading", { name: "vessel.glb", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Model ready");
  await expect(
    page.getByRole("button", { name: "Reset view", exact: true }),
  ).toBeEnabled();
});
test("context loss cancels pending load and supports a fresh retry", async ({
  page,
}) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  let seen;
  const requested = new Promise((resolve) => (seen = resolve));
  await ready(page);
  await page.route(
    "**/assets/vessel.glb",
    async (route) => {
      seen();
      await held;
      await route.continue();
    },
    { times: 1 },
  );
  await page
    .getByRole("button", { name: "Start 3D preview", exact: true })
    .click();
  await requested;
  await page
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(
    page.getByRole("button", { name: "Retry preview", exact: true }),
  ).toBeEnabled();
  release();
  await page
    .getByRole("button", { name: "Retry preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Model ready");
  await expect(page.locator("canvas")).toHaveCount(1);
});
