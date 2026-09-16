/* ═════════════════════════════════════════════════════════════════
   Blank — sound
   ─────────────────────────────────────────────────────────────────
   Three sounds, all synthesized with the Web Audio API.
   No audio files. No library. Zero kilobytes of assets.

     open   — a breath. Returning to today from earlier pages.
     page   — a paper turn. Any view transition.
     close  — a thud. "Done for today."

   Off by default. Opt-in. Barely audible by design.
   ═════════════════════════════════════════════════════════════════ */

window.Sound = (function () {
  "use strict";
  const KEY = "blank_sound";
  let ctx = null, master = null, enabled = false;
  function readPreference(){ try{return localStorage.getItem(KEY)==="on";}catch{return false;} }
  function savePreference(value){ try{localStorage.setItem(KEY,value?"on":"off");}catch{} }
  function isEnabled(){return enabled;}
  function ensureContext(){
    if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return null; ctx=new AC(); master=ctx.createGain(); master.gain.value=1; master.connect(ctx.destination); }
    if(ctx.state==="suspended")ctx.resume().catch(()=>{}); return ctx;
  }
  function noiseBuffer(c,duration){ const length=Math.floor(c.sampleRate*duration), buffer=c.createBuffer(1,length,c.sampleRate), data=buffer.getChannelData(0); for(let i=0;i<length;i++)data[i]=Math.random()*2-1; return buffer; }
  function breath(c,t0,dest){ const DUR=.5,src=c.createBufferSource(); src.buffer=noiseBuffer(c,DUR); const filter=c.createBiquadFilter(); filter.type="lowpass"; filter.Q.value=.7; filter.frequency.setValueAtTime(200,t0); filter.frequency.linearRampToValueAtTime(900,t0+DUR*.4); filter.frequency.linearRampToValueAtTime(300,t0+DUR); const gain=c.createGain(); gain.gain.setValueAtTime(0,t0); gain.gain.linearRampToValueAtTime(.05,t0+DUR*.35); gain.gain.linearRampToValueAtTime(0,t0+DUR); src.connect(filter).connect(gain).connect(dest); src.start(t0); src.stop(t0+DUR+.05); }
  function page(c,t0,dest){ const DUR=.22,src=c.createBufferSource(); src.buffer=noiseBuffer(c,DUR); const filter=c.createBiquadFilter(); filter.type="bandpass"; filter.Q.value=1.2; filter.frequency.setValueAtTime(1200,t0); filter.frequency.linearRampToValueAtTime(2800,t0+DUR*.7); const gain=c.createGain(); gain.gain.setValueAtTime(0,t0); gain.gain.linearRampToValueAtTime(.04,t0+.03); gain.gain.linearRampToValueAtTime(.018,t0+DUR*.6); gain.gain.linearRampToValueAtTime(0,t0+DUR); src.connect(filter).connect(gain).connect(dest); src.start(t0); src.stop(t0+DUR+.05); }
  function thud(c,t0,dest){ const DUR=.3,osc=c.createOscillator(); osc.type="sine"; osc.frequency.setValueAtTime(110,t0); osc.frequency.exponentialRampToValueAtTime(60,t0+DUR); const oscGain=c.createGain(); oscGain.gain.setValueAtTime(0,t0); oscGain.gain.linearRampToValueAtTime(.09,t0+.008); oscGain.gain.exponentialRampToValueAtTime(.001,t0+DUR); osc.connect(oscGain).connect(dest); osc.start(t0); osc.stop(t0+DUR); const click=c.createBufferSource(); click.buffer=noiseBuffer(c,.02); const clickFilter=c.createBiquadFilter(); clickFilter.type="bandpass"; clickFilter.frequency.value=1800; clickFilter.Q.value=2; const clickGain=c.createGain(); clickGain.gain.setValueAtTime(.03,t0); clickGain.gain.exponentialRampToValueAtTime(.001,t0+.03); click.connect(clickFilter).connect(clickGain).connect(dest); click.start(t0); click.stop(t0+.04); }
  function play(kind){ if(!enabled)return; const c=ensureContext(); if(!c)return; const t0=c.currentTime+.01; try{if(kind==="open")breath(c,t0,master); else if(kind==="page")page(c,t0,master); else if(kind==="close")thud(c,t0,master);}catch{} }
  function setEnabled(value){ enabled=!!value; savePreference(enabled); if(enabled)ensureContext(); return enabled; }
  function toggle(){return setEnabled(!enabled);}
  function boot(){ enabled=readPreference(); if(enabled)document.addEventListener("pointerdown",()=>ensureContext(),{once:true,passive:true}); }
  return {boot,isEnabled,setEnabled,toggle,play};
})();
