export const exhibits = [
  { id:'g17', number:'01', name:'GLOCK 17', version:'Gen5', fullName:'GLOCK 17 Gen5', maker:'GLOCK · 奥地利', tone:'现代 · 简洁', tag:'聚合物框架', capacity:17, caliber:'9 mm Luger', material:'聚合物 / 钢',
    intro:'从利落的直线开始，观察现代工业设计。平整的上部轮廓与细密的握把纹理，让不同材料各自表达。',
    observation:'试着旋转展品：上部的平直边缘与握把的倾斜线条，形成了怎样的对比？',
    source:'https://br.glock.com/pt-br/pistolas/g17-gen5', sourceName:'GLOCK · G17 Gen5 官方资料',
    descriptions:{upper:'这一观察区呈现平直的上部外壳。留意边缘的倒角，以及表面重复出现的短线纹理。模型用简化的形状表达这些外观特点。',frame:'框架外观把几种轮廓连接起来。这款参考展品使用聚合物框架；它的表面质感与上部金属形成对比。',grip:'握把表面有细密的纹理。观察点、线和斜面的组合，想一想：同样的黑色，为什么还能看出不同的区域？',guard:'护圈外观围出一块留白。你可以转到侧面，比较它的曲线与上部外壳的直线。这里只观察外形。'} },
  { id:'92fs', number:'02', name:'Beretta 92FS', version:'标准型 · 9×19 mm', fullName:'Beretta 92FS', maker:'BERETTA · 意大利', tone:'经典 · 曲线', tag:'开放式上部轮廓', capacity:15, caliber:'9×19 mm', material:'铝 / 钢',
    intro:'直线之外，还有曲线。开放的上部轮廓、圆润的转折和深色握把，组合成另一种工业设计语言。',
    observation:'从斜上方观察：这款展品上部的留白，与 GLOCK 17 的完整平面有什么不同？',
    source:'https://www.berettadefense.com/products/92fs-bdt/', sourceName:'Beretta Defense · 92FS 官方资料',
    descriptions:{upper:'开放式上部轮廓是这款参考展品的显著特点。从斜上方看，可以发现长条形表面之间的留白。',frame:'这款参考展品的框架材料是铝。观察前部直线如何过渡到后部曲线，比较金属表面的不同明暗。',grip:'深色握把面板与框架分出清晰的边界。重复的表面纹理和圆形装饰，让这一小块区域很有节奏。',guard:'观察护圈的弧形转折与中间的留白。把它转到另一面，看看这条轮廓是否对称。'} },
  { id:'1911', number:'03', name:'Colt 1911', version:'Classic SS · .45 ACP', fullName:'Colt 1911 Classic SS', maker:'COLT · 美国', tone:'复古 · 材质', tag:'不锈钢与木色', capacity:7, caliber:'.45 ACP', material:'不锈钢 / 木质',
    intro:'银色金属与温暖木色相遇。在这款当代 Classic SS 参考展品中，观察材质、纹理与经典轮廓的关系。',
    observation:'移动视角，让光沿着银色表面滑动。金属与木色握把的反光，有什么不同？',
    source:'https://www.colt.com/detail-page/1911-classic-ss/', sourceName:'Colt · 1911 Classic SS 官方资料',
    descriptions:{upper:'圆润的顶部与较平的侧面呈现不同反光。这款外观示意用银色材质，表达不锈钢参考展品的视觉特征。',frame:'银色框架沿着外壳延伸，再转向倾斜的握把区域。观察连续轮廓是怎样把不同部分连接起来的。',grip:'木色面板与银色框架形成冷暖对比。这里的菱形纹理是原创简化表达，并非真实产品的精确纹样。',guard:'这一观察区用一条弧形轮廓围出留白。比较它与其他两款展品，看看曲线的性格是否相同。'} }
];
export const regions = [
  { id:'upper', name:'上部外壳', en:'UPPER FORM', hint:'直线、倒角与表面节奏' },
  { id:'frame', name:'框架外观', en:'FRAME PROFILE', hint:'连接整体的轮廓' },
  { id:'grip', name:'握把表面', en:'GRIP TEXTURE', hint:'材料与纹理的对话' },
  { id:'guard', name:'护圈外观', en:'GUARD OUTLINE', hint:'观察曲线与留白' }
];
export const scenarios = [
  { question:'在公园里，看到一个像枪的物品。你会怎么做？', options:['不触碰，离开并告诉可信任的成年人','拿起来看看是不是玩具','叫朋友一起靠近看看'], correct:0, explanation:'外观不能证明它是玩具。不触碰、离开，再告诉可信任的成年人。' },
  { question:'朋友说「一定是玩具」，邀请你一起拿起来。', options:['先按一按，确认一下','拒绝触碰，离开并告诉成年人','只拿一下应该没关系'], correct:1, explanation:'朋友的判断也可能出错。你可以明确说不，离开现场并告诉可信任的成年人。' },
  { question:'你已离开可疑物品，接下来应该怎么做？', options:['自己回去把它藏好','拍个近照发给朋友','告诉可信任的成年人在哪里看见了它'], correct:2, explanation:'保持距离，用语言告诉成年人位置和看到的情况，让成年人处理。' }
];
export function cartVelocity(mass, impulse=2) { return impulse / mass; }
