// Shaving sound: loops shaving.mp3 while the player is cutting

const BASE = import.meta.env.BASE_URL;

export class ShavingAudio {
  constructor() {
    this.sound = new Audio(`${BASE}sounds/shaving.mp3`);
    this.sound.loop = true;
    this.playing = false;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.sound.currentTime = 0;
    this.sound.play().catch(() => {});
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    this.sound.pause();
  }

  kill() {
    this.playing = false;
    this.sound.pause();
    this.sound.currentTime = 0;
  }
}
