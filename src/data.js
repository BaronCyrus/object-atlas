export const assetVersion = "20260912-v2";
export const regions = [
  {
    id: "slide",
    name: "套筒",
    en: "SLIDE",
    hint: "上面长长的金属外壳",
    color: "#8095a1",
  },
  {
    id: "barrel",
    name: "枪管",
    en: "BARREL",
    hint: "前端的圆管外观",
    color: "#b89455",
  },
  {
    id: "frame",
    name: "枪身",
    en: "FRAME",
    hint: "连接各部分的主体",
    color: "#769286",
  },
  {
    id: "grip",
    name: "握把",
    en: "GRIP",
    hint: "后下方有纹理的部分",
    color: "#a78161",
  },
  {
    id: "guard",
    name: "护圈",
    en: "TRIGGER GUARD",
    hint: "围在扳机外面的圈",
    color: "#87977a",
  },
  {
    id: "trigger",
    name: "扳机",
    en: "TRIGGER",
    hint: "护圈里面弯弯的部位",
    color: "#bc926c",
  },
  {
    id: "front_sight",
    name: "准星",
    en: "FRONT SIGHT",
    hint: "顶部前端的小凸起",
    color: "#809bb0",
  },
  {
    id: "rear_sight",
    name: "照门",
    en: "REAR SIGHT",
    hint: "顶部后端的小凹口",
    color: "#8492ac",
  },
  {
    id: "magazine",
    name: "弹匣",
    en: "MAGAZINE",
    hint: "握把里的盒状部件",
    color: "#928f76",
  },
  {
    id: "controls",
    name: "外部按钮",
    en: "EXTERIOR CONTROLS",
    hint: "枪身侧面的不同小形状",
    color: "#a58b92",
  },
  {
    id: "rear",
    name: "后部部件",
    en: "REAR DETAIL",
    hint: "转过去看看背面",
    color: "#9a91ad",
  },
];
const common = {
  barrel: "前面这段圆圆的管子，叫枪管。动画里的小弹头，会从它的前端向前移动。",
  frame: "这个连接各个部分的主体，叫枪身。套筒在上面，握把在它的后下方。",
  guard:
    "围在扳机外面的这个圈，叫护圈。看看，它和里面弯弯的扳机是两个不同的形状。",
  trigger:
    "护圈里面弯弯的这一块，叫扳机。你可以在屏幕上转动模型，看看它的外形。",
  front_sight: "顶部靠前的小凸起，叫准星。把模型转到侧面，就能发现它。",
  rear_sight:
    "顶部靠后、有一个小凹口的部位，叫照门。它和前面的准星，一前一后。",
  magazine: "这个盒子一样的部件，叫弹匣。它的一部分藏在握把里，底部露在外面。",
  controls:
    "枪身侧面有几个小按钮和小杆。它们的名字和用途不完全一样，这里先看看它们的形状和位置。",
};
export const exhibits = [
  {
    id: "g17",
    number: "01",
    name: "GLOCK 17",
    cn: "格洛克 17",
    version: "Gen5 · 前防滑纹型",
    fullName: "GLOCK 17 Gen5",
    maker: "GLOCK · 奥地利",
    tone: "黑色聚合物",
    tag: "方形套筒",
    capacity: 17,
    caliber: "9 mm Luger",
    material: "聚合物枪身 / 金属套筒",
    intro:
      "它叫格洛克十七，五代。方方的套筒下面，是黑色的枪身。点一个部位，听听它叫什么。",
    observation: "前后都有防滑纹，握把没有手指凹槽。",
    source: "https://eu.glock.com/en/products/pistols/g17-gen5",
    sourceName: "GLOCK 官方型号页与 360° 摄影",
    photoSources: [
      ["左侧", "https://eu.glock.com/3DPlayer/g17_gen5_fs/c6_l1_0_0.jpg"],
      ["前面", "https://eu.glock.com/3DPlayer/g17_gen5_fs/c12_l1_0_0.jpg"],
      ["顶部", "https://eu.glock.com/3DPlayer/g17_gen5_fs/c96_l1_0_0.jpg"],
    ],
    rearName: "后盖板",
    muzzle: [-1.94, 0.86, 0],
    descriptions: {
      ...common,
      slide:
        "上面这块长长的金属外壳，叫套筒。格洛克的套筒比较方，前后都能看到一排排短纹。",
      grip: "后下方这一块叫握把。它和枪身连在一起，表面有细细的颗粒纹理。",
      rear: "转到后面，这一小块叫套筒后盖板。它的外形比较平整，和另外两款枪后面突出的击锤不一样。",
    },
  },
  {
    id: "92fs",
    number: "02",
    name: "Beretta 92FS",
    cn: "贝雷塔 92FS",
    version: "92FS · 黑色标准型",
    fullName: "Beretta 92FS",
    maker: "BERETTA · 意大利",
    tone: "黑色金属",
    tag: "开放式顶部",
    capacity: 15,
    caliber: "9×19 mm",
    material: "黑色金属表面 / 网纹握片",
    intro:
      "它叫贝雷塔九二式。它的顶部有一段敞开的地方，能看到圆圆的枪管。我们来找找不同的部位。",
    observation: "敞开的顶部、黑色网纹握片和圆环形击锤。",
    source: "https://www.berettadefense.com/products/92fs-bdt/",
    sourceName: "Beretta Defense · 92FS 官方资料",
    photoSources: [
      ["侧面", "https://www.beretta.com/en-us/product/92fs-FA0043"],
      ["多角度图库", "https://www.beretta.com/en-us/product/92fs-FA0043"],
    ],
    rearName: "击锤外形",
    muzzle: [-1.9, 1.045, 0],
    descriptions: {
      ...common,
      slide:
        "长长的这一部分叫套筒。贝雷塔这款的顶部有一大段敞开，和格洛克方方的顶部不一样。",
      grip: "这是握把。两侧的黑色握片上，有细密的交叉纹路，还有圆圆的螺钉。",
      rear: "后面露出的这个小部件，叫击锤。它的顶端有圆环一样的外形，很容易认出来。",
    },
  },
  {
    id: "1911",
    number: "03",
    name: "Colt 1911",
    cn: "柯尔特 1911",
    version: "Classic SS · .45 ACP",
    fullName: "Colt 1911 Classic SS",
    maker: "COLT · 美国",
    tone: "银色与木色",
    tag: "圆顶套筒",
    capacity: null,
    caliber: ".45 ACP",
    material: "不锈钢外观 / 木质握片",
    intro:
      "它叫柯尔特一九一一。银色的枪身，配着棕色的木握片。看看你能认出哪些部位。",
    observation: "银色圆顶套筒、棕色木握片和尖尾形击锤。",
    source:
      "https://www.colt.com/detail-page/classic/?attribute_pa_variant=1911-classic-ss-45acp",
    sourceName: "Colt · Classic SS 官方变体资料",
    photoSources: [
      [
        "官方侧面照片",
        "https://www.colt.com/wp-content/uploads/2022/12/O1911C-FLATLAY-LEFT-1.jpg",
      ],
    ],
    rearName: "击锤外形",
    muzzle: [-2.075, 0.906, 0],
    descriptions: {
      ...common,
      slide:
        "上面银色的长外壳，叫套筒。它的顶部圆圆的，后面还有一排竖着的细纹。",
      grip: "这是握把。两侧棕色的木握片，和银色枪身的颜色很不一样。每边都能看到两颗螺钉。",
      rear: "枪的后面露出一个细长的小尾巴，它是击锤的外形。和贝雷塔圆环一样的击锤比一比吧。",
    },
  },
];
export const animationNarration =
  "看，小弹头向前移动，枪身短暂地向后动了一下。这个向后的运动，叫后坐。这里播放的是放慢的动画。";
export const regionInfo = (id, exhibit) => {
  const r = regions.find((r) => r.id === id);
  return r ? { ...r, name: id === "rear" ? exhibit.rearName : r.name } : null;
};
