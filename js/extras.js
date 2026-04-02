(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const btn = document.getElementById("ambient-toggle");
  const toast = document.getElementById("easter-toast");

  let audioCtx = null;
  let noiseSource = null;
  let hissPlaying = false;

  function buildHiss() {
    if (!audioCtx) return;
    const dur = 2;
    const rate = audioCtx.sampleRate;
    const frames = Math.floor(rate * dur);
    const buffer = audioCtx.createBuffer(1, frames, rate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) ch[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lp = audioCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = reduced ? 2400 : 3800;
    lp.Q.value = 0.4;
    const gain = audioCtx.createGain();
    gain.gain.value = reduced ? 0.014 : 0.042;
    src.connect(lp);
    lp.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(0);
    noiseSource = src;
  }

  function stopHiss() {
    if (!noiseSource) return;
    try {
      noiseSource.stop();
    } catch (_) {}
    noiseSource = null;
  }

  if (btn) {
    if (reduced) {
      btn.disabled = true;
      btn.title = "Hareket azaltıldığında kapalı";
    } else {
      btn.addEventListener("click", async () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        if (!hissPlaying) {
          buildHiss();
          hissPlaying = true;
          btn.setAttribute("aria-pressed", "true");
        } else {
          stopHiss();
          hissPlaying = false;
          btn.setAttribute("aria-pressed", "false");
        }
      });
    }
  }

  const seq = ["b", "a", "r"];
  let seqIdx = 0;
  let lastKeyTime = 0;
  let toastTimer = 0;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("easter-toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("easter-toast--visible"), 4200);
  }

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    const tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (e.key === "?") {
      e.preventDefault();
      document.body.classList.toggle("contrast-ritual");
      return;
    }

    const k = e.key.toLowerCase();
    if (k.length !== 1) return;
    const now = Date.now();
    if (now - lastKeyTime > 2200) seqIdx = 0;
    lastKeyTime = now;
    if (k === seq[seqIdx]) {
      seqIdx += 1;
      if (seqIdx === seq.length) {
        showToast("void listens.");
        seqIdx = 0;
      }
    } else {
      seqIdx = k === seq[0] ? 1 : 0;
    }
  });
})();
