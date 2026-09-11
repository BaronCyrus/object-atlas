export class GuideSpeech {
  constructor({ status, play, pause, stop, rate }) {
    Object.assign(this, { status, play, pause, stop, rate });
    this.state = "idle";
    this.generation = 0;
    this.audio = null;
    this.mode = "recorded";
    play.disabled = false;
    status.textContent = "中文音频已备好，点一个部位就会讲。";
    pause.addEventListener("click", () => this.togglePause());
    stop.addEventListener("click", () => this.cancel());
    rate.addEventListener("change", () => {
      if (this.audio) this.audio.playbackRate = Number(rate.value);
    });
    window.addEventListener("pagehide", () => this.cancel(false));
  }
  speak(text, url) {
    this.cancel(false);
    const generation = this.generation;
    this.state = "starting";
    this.play.disabled = true;
    this.stop.disabled = false;
    this.status.textContent = "正在准备讲解…";
    this.text = text;
    const valid = () => this.generation === generation;
    const audio = new Audio(url);
    this.audio = audio;
    audio.preload = "auto";
    audio.playbackRate = Number(this.rate.value);
    audio.onplaying = () => {
      if (!valid()) return;
      this.state = "speaking";
      this.pause.disabled = false;
      this.pause.textContent = "暂停";
      this.status.textContent = "正在讲解…";
    };
    audio.onended = () => {
      if (valid()) this.finish("讲完啦。再点一个部位吧。");
    };
    audio.onerror = () => {
      if (valid()) this.finish("音频暂时没有加载成功，点「再听一遍」重试。");
    };
    audio.play().catch((error) => {
      if (!valid() || error.name === "AbortError") return;
      this.finish(
        error.name === "NotAllowedError"
          ? "请点「再听一遍」开启声音。"
          : "声音暂时不可用，点「再听一遍」重试。",
      );
    });
  }
  finish(message) {
    this.state = "idle";
    this.play.disabled = false;
    this.pause.disabled = true;
    this.stop.disabled = true;
    this.pause.textContent = "暂停";
    this.status.textContent = message;
  }
  cancel(show = true) {
    this.generation++;
    if (this.audio) {
      this.audio.pause();
      this.audio.onplaying = null;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    this.finish(show ? "讲解已停止。" : "点一个部位，听听它叫什么。");
  }
  togglePause() {
    if (this.state === "speaking" && this.audio) {
      this.audio.pause();
      this.state = "paused";
      this.pause.textContent = "继续";
      this.status.textContent = "讲解已暂停。";
    } else if (this.state === "paused" && this.audio) {
      this.audio.play().catch(() => this.finish("请重新播放讲解。"));
    }
  }
}
