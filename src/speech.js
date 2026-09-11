export class GuideSpeech {
  constructor({ status, play, pause, stop, rate }) {
    Object.assign(this, { status, play, pause, stop, rate });
    this.synth = window.speechSynthesis;
    this.state = "idle";
    this.generation = 0;
    this.supported = !!this.synth && "SpeechSynthesisUtterance" in window;
    if (this.supported) {
      this.synth.addEventListener("voiceschanged", () => this.refresh());
    }
    this.refresh();
    pause.addEventListener("click", () => this.togglePause());
    stop.addEventListener("click", () => this.cancel());
    rate.addEventListener("change", () => {
      if (this.state === "speaking" || this.state === "paused") {
        this.cancel();
        this.status.textContent = "语速已更新，点击「听讲解」重新朗读。";
      }
    });
    window.addEventListener("pagehide", () => this.cancel());
  }
  refresh() {
    this.voice = this.supported
      ? this.synth.getVoices().find((v) => /^zh[-_]?(CN|Hans)/i.test(v.lang)) ||
        this.synth.getVoices().find((v) => /^zh/i.test(v.lang))
      : null;
    this.play.disabled = !this.voice;
    if (this.state === "idle")
      this.status.textContent = !this.supported
        ? "此浏览器不支持语音，完整讲解可直接阅读。"
        : !this.voice
          ? "未发现中文声音，请使用文字讲解，或在系统中安装中文语音。"
          : "中文声音已就绪，点击播放。";
  }
  speak(text) {
    if (!this.voice) return;
    this.cancel(false);
    const generation = this.generation;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = Number(this.rate.value);
    this.utterance = utterance;
    this.state = "starting";
    this.play.disabled = true;
    this.stop.disabled = false;
    this.status.textContent = "正在准备朗读…";
    const valid = () => generation === this.generation;
    utterance.onstart = () => {
      if (!valid()) return;
      clearTimeout(this.watchdog);
      this.state = "speaking";
      this.pause.disabled = false;
      this.status.textContent = "正在朗读当前讲解…";
    };
    utterance.onend = () => {
      if (!valid()) return;
      this.finish("朗读结束。可以选择另一个观察区。");
    };
    utterance.onerror = (e) => {
      if (!valid()) return;
      this.finish(
        e.error === "canceled"
          ? "朗读已停止。"
          : "语音暂时不可用，请阅读文字讲解。",
      );
    };
    this.watchdog = setTimeout(() => {
      if (valid() && this.state === "starting") {
        this.cancel(false);
        this.status.textContent = "声音未能启动，请重试或阅读文字讲解。";
      }
    }, 8000);
    this.synth.speak(utterance);
  }
  finish(message) {
    clearTimeout(this.watchdog);
    this.state = "idle";
    this.play.disabled = !this.voice;
    this.pause.disabled = true;
    this.stop.disabled = true;
    this.pause.textContent = "暂停";
    this.status.textContent = message;
    this.utterance = null;
  }
  cancel(show = true) {
    this.generation++;
    clearTimeout(this.watchdog);
    if (this.supported) {
      this.synth.cancel();
      this.synth.resume();
    }
    this.finish(show ? "朗读已停止。" : "");
    if (!show) this.refresh();
  }
  togglePause() {
    if (this.state === "speaking") {
      this.synth.pause();
      this.state = "paused";
      this.pause.textContent = "继续";
      this.status.textContent = "朗读已暂停。";
    } else if (this.state === "paused") {
      this.synth.resume();
      this.state = "speaking";
      this.pause.textContent = "暂停";
      this.status.textContent = "正在朗读当前讲解…";
    }
  }
}
