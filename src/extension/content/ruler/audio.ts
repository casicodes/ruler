/** Short mechanical-shutter–style click (Web Audio; requires a user gesture). */
export function playCameraShutterSound(): void {
  type AudioCtxCtor = typeof AudioContext;
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: AudioCtxCtor })
          .webkitAudioContext);
  if (!Ctor) return;
  const ctx = new Ctor();
  const run = () => {
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.32, t);
    master.connect(ctx.destination);

    const dur = 0.055;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (frames * 0.22));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(nGain);
    nGain.connect(master);
    noise.start(t);
    noise.stop(t + dur);

    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, t + 0.038);
    const oGain = ctx.createGain();
    oGain.gain.setValueAtTime(0, t + 0.038);
    oGain.gain.linearRampToValueAtTime(0.11, t + 0.042);
    oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
    osc.connect(oGain);
    oGain.connect(master);
    osc.start(t + 0.038);
    osc.stop(t + 0.09);
  };
  if (ctx.state === "suspended") {
    void ctx.resume().then(run);
  } else {
    run();
  }
}
