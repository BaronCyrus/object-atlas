import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { assetVersion } from "../src/data.js";
const base =
  process.env.SITE_URL || "https://baroncyrus.github.io/object-atlas/";
const response = await fetch(base);
if (!response.ok) throw new Error(`Homepage returned ${response.status}`);
const html = await response.text();
if (!html.includes("构物")) throw new Error("Unexpected homepage content");
const codeAssets = [
  ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
].map((m) => m[1]);
const narration = JSON.parse(
  await readFile("public/audio/narration.json", "utf8"),
);
const files = [
  ...codeAssets,
  "favicon.svg",
  ...["g17", "92fs", "1911"].flatMap((id) => [
    `models/${id}.glb`,
    `images/${id}.png`,
  ]),
  "audio/narration.json",
  ...Object.keys(narration.clips).map((id) => `audio/${id}.mp3`),
];
const results = [];
for (const path of files) {
  const url = new URL(path, base);
  if (!path.includes("assets/")) url.searchParams.set("v",assetVersion);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url.pathname}: ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const local = await readFile(`dist/${path.replace(/^\.\//, "")}`);
  const hash = (data) => createHash("sha256").update(data).digest("hex");
  if (hash(bytes) !== hash(local))
    throw new Error(`${path}: deployed content differs from local build`);
  if (path.endsWith(".glb") && bytes.subarray(0, 4).toString() !== "glTF")
    throw new Error("Invalid GLB header");
  results.push({
    path,
    status: res.status,
    contentType: res.headers.get("content-type"),
    bytes: bytes.length,
    sha256: hash(bytes),
  });
}
const report = {
  url: base,
  checkedAt: new Date().toISOString(),
  homepageStatus: response.status,
  assets: results,
};
await writeFile(
  "reports/deployment.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      url: base,
      homepageStatus: response.status,
      verifiedAssets: results.length,
      allHashesMatch: true,
    },
    null,
    2,
  ),
);
