// Procedural Web Audio API sound synthesizer for GameVerse mini-games
// Zero external assets required, low latency, fully supports mute toggle

class SoundEffectsManager {
  constructor() {
    this.audioCtx = null;
    this.muted =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('gv_sound_muted') === 'true'
        : false;
    this.listeners = new Set();
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gv_sound_muted', this.muted ? 'true' : 'false');
    }
    this.listeners.forEach((cb) => cb(this.muted));
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  playTone(freq, duration = 0.1, type = 'sine', gainVal = 0.1) {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context policy safe fallback
    }
  }

  // 3-2-1 Countdown Beep
  playCountdownTick() {
    this.playTone(440, 0.12, 'sine', 0.15);
  }

  // Countdown GO! ping
  playCountdownGo() {
    this.playTone(880, 0.3, 'triangle', 0.2);
  }

  // Correct match / successful hit
  playSuccess() {
    if (this.muted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.15, 'triangle', 0.12), i * 60);
      });
    } catch {}
  }

  // Mistake buzz / premature click
  playMistake() {
    this.playTone(130, 0.28, 'sawtooth', 0.2);
  }

  // Combo multiplier sound with ascending pitch
  playCombo(streak = 1) {
    const baseFreq = 400;
    const freq = Math.min(1200, baseFreq + streak * 75);
    this.playTone(freq, 0.12, 'square', 0.08);
  }

  // Victory fanfare on session completion
  playVictory() {
    if (this.muted) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.22, 'triangle', 0.15), i * 90);
    });
  }

  // Subtle button click
  playClick() {
    this.playTone(600, 0.04, 'sine', 0.05);
  }
}

export const sounds = new SoundEffectsManager();
export default sounds;
