import "./style.css";
import {
  exhibits,
  regions,
  regionInfo,
  animationNarration,
  assetVersion,
} from "./data.js";
import { ExhibitViewer } from "./viewer.js";
import { GuideSpeech } from "./speech.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  base = import.meta.env.BASE_URL;
let current = exhibits[0],
  selectedRegion = null,
  viewer;
$("#catalog-list").innerHTML = exhibits
  .map(
    (e) =>
      `<button class="exhibit-card" data-id="${e.id}" aria-pressed="false" aria-label="查看 ${e.fullName}"><span class="card-top"><span>NO. ${e.number}</span><span class="selected-mark"></span></span><img class="card-image" src="${base}images/${e.id}.png?v=${assetVersion}" width="192" height="110" alt="${e.fullName} 三维模型配图"/><span class="card-title">${e.cn}</span><span class="card-bottom"><span>${e.version}</span></span></button>`,
  )
  .join("");
$("#hotspots").innerHTML = regions
  .map(
    (r, i) =>
      `<button class="hotspot" data-region="${r.id}" aria-label="在模型上选择${r.name}" aria-pressed="false" hidden>${i + 1}</button>`,
  )
  .join("");
const speech = new GuideSpeech({
  status: $("#speech-status"),
  play: $("#speak"),
  pause: $("#pause"),
  stop: $("#stop"),
  rate: $("#speech-rate"),
});
function renderRegions() {
  $("#region-list").innerHTML = regions
    .map(
      (r, i) =>
        `<button class="region-button" data-region="${r.id}" aria-pressed="false"><span class="region-index" style="--part-color:${r.color}">${i + 1}</span><span class="region-text"><strong>${regionInfo(r.id, current).name}</strong></span><span class="region-audio" aria-hidden="true">♪</span></button>`,
    )
    .join("");
  $$(".region-button").forEach((b) =>
    b.addEventListener("click", () => selectRegion(b.dataset.region, true)),
  );
}
function narrate() {
  const id = selectedRegion
    ? `${current.id}-${selectedRegion}`
    : `${current.id}-intro`;
  speech.speak(
    selectedRegion ? current.descriptions[selectedRegion] : current.intro,
    `${base}audio/${id}.mp3?v=${assetVersion}`,
  );
}
function selectRegion(id, play = false) {
  selectedRegion = id;
  speech.cancel(false);
  viewer?.select(id);
  $$("[data-region]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.region === id)),
  );
  const info = regionInfo(id, current);
  $("#region-en").textContent = info?.en || "LET’S LOOK CLOSER";
  $("#region-name").textContent = info?.name || "想先认识哪一部分？";
  $("#region-description").textContent = info
    ? current.descriptions[id]
    : "点模型上的圆点，或者点上面的部位名称。";
  $("#part-callout").hidden = !info;
  if (info) {
    $("#callout-index").textContent = regions.findIndex((r) => r.id === id) + 1;
    $("#callout-name").textContent = info.name;
  }
  if (play && $("#auto-speech").checked) narrate();
}
function resetButtons() {
  $("#explode").setAttribute("aria-pressed", "false");
  $("#auto-rotate").setAttribute("aria-pressed", "false");
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === "perspective"),
  );
  $("#view-caption").textContent = "立体观察";
}
function chooseExhibit(id, play = false) {
  current = exhibits.find((e) => e.id === id) || exhibits[0];
  renderRegions();
  $$(".exhibit-card").forEach((b) => {
    const active = b.dataset.id === current.id;
    b.classList.toggle("selected", active);
    b.setAttribute("aria-pressed", String(active));
    b.querySelector(".selected-mark").textContent = active ? "✓" : "";
  });
  $("#maker").textContent = current.maker;
  $("#exhibit-name").textContent = current.name;
  $("#version").textContent = current.version;
  $("#exhibit-intro").textContent = current.intro;
  $("#observation").textContent = current.observation;
  $("#viewer-edition").textContent = `EXHIBIT ${current.number} / 03`;
  $("#watermark").textContent = { g17: "G17", "92fs": "92FS", 1911: "1911" }[
    current.id
  ];
  $("#facts").innerHTML = [
    ["具体版本", current.version],
    ["口径标识", current.caliber],
    [
      "标准弹匣容量",
      current.capacity ? `${current.capacity} 发` : "官方字段冲突，暂不标注",
    ],
    ["材质观察", current.material],
  ]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join("");
  $("#capacity-note").textContent = current.capacity
    ? "容量仅对应所列标准配置，不包含膛内数量。其他版本和地区配置可能不同。"
    : "Colt 当前官方页面的变体描述与容量字段不一致，因此不沿用旧版数值。";
  $("#source").href = current.source;
  $("#source").textContent = current.sourceName + " ↗";
  $("#photo-sources").innerHTML = current.photoSources
    .map(
      ([name, url]) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}参考 ↗</a>`,
    )
    .join("");
  selectRegion(null);
  resetButtons();
  viewer?.load(current);
  if (play && $("#auto-speech").checked) narrate();
}
function animationState({ state, progress, caption }) {
  const running = state === "playing" || state === "paused";
  $("#animation-pause").disabled = !running;
  $("#animation-pause").textContent =
    state === "paused" ? "继续动画" : "暂停动画";
  $("#animation-progress").style.width = `${progress * 100}%`;
  $("#animation-caption").hidden = state === "idle";
  if (caption) $("#animation-caption").textContent = caption;
  $("#viewer").dataset.animation = state;
  $("#shoot").textContent = running ? "↻ 重新看动画" : "▷ 射击动画";
}
try {
  viewer = new ExhibitViewer(
    $("#model-canvas"),
    (id) => selectRegion(id, true),
    (state, message) => {
      $("#viewer").dataset.state = state;
      $("#load-state").hidden = state === "ready";
      $("#load-state").textContent = message || "";
      $("#load-state").style.cursor = state === "error" ? "pointer" : "default";
      $("#load-state").setAttribute(
        "role",
        state === "error" ? "button" : "status",
      );
      if (state === "error") $("#load-state").tabIndex = 0;
      else $("#load-state").removeAttribute("tabindex");
      $$("#explode,#auto-rotate,#reset,#shoot,[data-view]").forEach(
        (b) => (b.disabled = state !== "ready"),
      );
    },
    animationState,
  );
} catch (e) {
  $("#viewer").dataset.state = "unsupported";
  $("#load-state").textContent =
    "此设备暂不支持三维显示。你仍可看配图、点部位听讲解。";
  $$("#explode,#auto-rotate,#reset,#shoot,[data-view]").forEach(
    (b) => (b.disabled = true),
  );
  console.warn("WebGL unavailable", e.message);
}
$("#load-state").addEventListener("click", () => {
  if ($("#viewer").dataset.state === "error") viewer?.load(current);
});
$("#load-state").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    $("#load-state").click();
  }
});
$$(".exhibit-card").forEach((b) =>
  b.addEventListener("click", () => chooseExhibit(b.dataset.id, true)),
);
$$(".hotspot").forEach((b) =>
  b.addEventListener("click", () => selectRegion(b.dataset.region, true)),
);
$("#search").addEventListener("input", (e) => {
  const term = e.target.value.trim().toLowerCase();
  let shown = 0;
  $$(".exhibit-card").forEach((b) => {
    const model = exhibits.find((e) => e.id === b.dataset.id);
    b.hidden = !`${model.cn} ${model.fullName} ${model.version}`
      .toLowerCase()
      .includes(term);
    if (!b.hidden) shown++;
  });
  $("#no-results").hidden = shown > 0;
});
function switchTab(facts) {
  $("#tab-observe").setAttribute("aria-selected", String(!facts));
  $("#tab-facts").setAttribute("aria-selected", String(facts));
  $("#tab-observe").tabIndex = facts ? -1 : 0;
  $("#tab-facts").tabIndex = facts ? 0 : -1;
  $("#panel-observe").hidden = facts;
  $("#panel-facts").hidden = !facts;
}
$("#tab-observe").addEventListener("click", () => switchTab(false));
$("#tab-facts").addEventListener("click", () => switchTab(true));
$$("[role=tab]").forEach((b) =>
  b.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const facts =
        e.key === "End" || (e.key !== "Home" && b.id === "tab-observe");
      switchTab(facts);
      $(facts ? "#tab-facts" : "#tab-observe").focus();
    }
  }),
);
$("#explode").addEventListener("click", () => {
  if (!viewer) return;
  viewer.setExploded(!viewer.exploded);
  $("#explode").setAttribute("aria-pressed", String(viewer.exploded));
  $("#auto-rotate").setAttribute("aria-pressed", "false");
  $("#view-caption").textContent = viewer.exploded
    ? "分区观察 · 并非实物拆装"
    : "整体观察";
});
$("#auto-rotate").addEventListener("click", () => {
  if (!viewer) return;
  viewer.stopAnimation();
  const enable = !viewer.controls.autoRotate;
  if (enable) {
    viewer.applyView("perspective");
    $$("[data-view]").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === "perspective"),
    );
  }
  viewer.controls.autoRotate = enable;
  $("#auto-rotate").setAttribute("aria-pressed", String(enable));
});
$("#reset").addEventListener("click", () => {
  viewer?.reset();
  selectRegion(null);
  resetButtons();
});
$$("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    viewer?.view(b.dataset.view);
    $$("[data-view]").forEach((el) => el.classList.toggle("active", el === b));
    $("#auto-rotate").setAttribute("aria-pressed", "false");
    $("#view-caption").textContent =
      b.dataset.view === "perspective"
        ? "立体观察"
        : `${b.textContent} · 正交观察`;
  }),
);
$("#show-labels").addEventListener("change", (e) =>
  viewer?.setLabels(e.target.checked),
);
$("#shoot").addEventListener("click", () => {
  if (!viewer) return;
  selectRegion(null);
  resetButtons();
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === "side"),
  );
  $("#view-caption").textContent = "慢动作示意";
  viewer.playAnimation(Number($("#animation-speed").value));
  if ($("#auto-speech").checked)
    speech.speak(
      animationNarration,
      `${base}audio/animation.mp3?v=${assetVersion}`,
    );
});
$("#animation-pause").addEventListener("click", () => viewer?.pauseAnimation());
$("#animation-speed").addEventListener("change", () => {
  if (viewer?.animation)
    viewer.playAnimation(Number($("#animation-speed").value));
});
$("#speak").addEventListener("click", narrate);
$("#auto-speech").addEventListener("change", (e) => {
  if (!e.target.checked) speech.cancel(false);
});
const dialog = $("#about-dialog");
$("#all-sources").innerHTML = exhibits
  .map(
    (e) =>
      `<a href="${e.source}" target="_blank" rel="noopener noreferrer">${e.fullName} · 官方资料 ↗</a>`,
  )
  .join("");
$$("#about-open,#footer-about").forEach((b) =>
  b.addEventListener("click", () => dialog.showModal()),
);
$("#about-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
chooseExhibit("g17");
window.atlasDiagnostics = () => ({
  model: viewer?.modelId,
  ready: viewer?.ready,
  groups: Object.keys(viewer?.groups || {}),
  sourceMeshes: viewer?.model?.userData.sourceMeshes,
  meshes: viewer?.model
    ? (() => {
        let n = 0;
        viewer.model.traverse((o) => {
          if (o.isMesh) n++;
        });
        return n;
      })()
    : 0,
  active: viewer?.active,
  frames: viewer?.frames,
  expanded: viewer?.exploded,
  positions: Object.fromEntries(
    Object.entries(viewer?.groups || {}).map(([k, o]) => [
      k,
      o.position.toArray(),
    ]),
  ),
  camera: viewer?.camera.position.toArray(),
  projection: viewer?.camera.type,
  animation: viewer?.animation
    ? {
        progress: viewer.animation.elapsed / viewer.animation.duration,
        paused: viewer.animation.paused,
        projectileVisible: viewer.projectile.visible,
        projectile: viewer.projectile.position.toArray(),
        recoil: viewer.model.position.x,
      }
    : null,
  audio: {
    state: speech.state,
    src: speech.audio?.src,
    currentTime: speech.audio?.currentTime,
    duration: speech.audio?.duration,
    rate: speech.audio?.playbackRate,
  },
  highlighted: viewer?.model
    ? (() => {
        let n = 0;
        viewer.model.traverse((o) => {
          if (o.isMesh && o.material.emissiveIntensity > 0) n++;
        });
        return n;
      })()
    : 0,
});
