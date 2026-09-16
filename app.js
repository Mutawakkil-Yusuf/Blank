/* ═════════════════════════════════════════════════════════════════
   Blank — app logic
   ─────────────────────────────────────────────────────────────────
   Contents
     1.  Storage
     2.  Dates
     3.  Markdown
     4.  DOM helpers
     5.  Toast
     6.  Theme
     7.  Greeting
     8.  Editor
     9.  Save status
    10.  Views
    11.  Export
    12.  Events
    13.  Boot
   ═════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ───────────────────────────────────────────────────────────────
     1. Storage
     ─────────────────────────────────────────────────────────────── */

  const KEY_PREFIX = "blank_entry_";
  const THEME_KEY = "blank_theme";

  const storage = {
    read(key) {
      let raw;
      try { raw = localStorage.getItem(key); }
      catch { return emptyEntry(); }
      if (!raw) return emptyEntry();
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && typeof parsed.html === "string") {
          return { html: parsed.html, createdAt: parsed.createdAt || null, updatedAt: parsed.updatedAt || null };
        }
      } catch {}
      return { html: raw, createdAt: null, updatedAt: null };
    },
    write(key, entry) {
      try { localStorage.setItem(key, JSON.stringify(entry)); return true; } catch { return false; }
    },
    writeRaw(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
    remove(key) { try { localStorage.removeItem(key); return true; } catch { return false; } },
    readRaw(key) { try { return localStorage.getItem(key) || ""; } catch { return ""; } },
    keysWithPrefix(prefix) {
      const keys=[]; try { for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith(prefix))keys.push(k.slice(prefix.length));} } catch {} return keys;
    },
  };
  function emptyEntry(){ return {html:"",createdAt:null,updatedAt:null}; }


  /* ───────────────────────────────────────────────────────────────
     2. Dates
     ─────────────────────────────────────────────────────────────── */

  const dates = {
    todayKey(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`;},
    todayLabel(d=new Date()){const weekday=d.toLocaleDateString("en-US",{weekday:"long"}),month=d.toLocaleDateString("en-US",{month:"long"});return `${weekday} · ${month} ${d.getDate()}`;},
    longLabel(key){return parseKey(key).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});},
    shortLabel(key){const date=parseKey(key),weekday=date.toLocaleDateString("en-US",{weekday:"long"}),month=date.toLocaleDateString("en-US",{month:"short"});return `${weekday}, ${month} ${date.getDate()}`;},
    relative(key){const date=parseKey(key),today=new Date();today.setHours(0,0,0,0);const days=Math.round((today-date)/86400000);if(days===1)return "yesterday";if(days===2)return "2 days ago";if(days===3)return "3 days ago";if(days<7)return `${days} days ago`;return "";},
    greeting(hour=new Date().getHours()){if(hour>=5&&hour<12)return "Good morning";if(hour>=12&&hour<17)return "Good afternoon";if(hour>=17&&hour<22)return "Good evening";return "A quiet night";},
    timeLabel(iso){if(!iso)return "";const d=new Date(iso);if(Number.isNaN(d.getTime()))return "";return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});}
  };
  function parseKey(key){const [y,m,d]=key.split("-").map(Number);return new Date(y,m-1,d);}


  /* ───────────────────────────────────────────────────────────────
     3. Markdown
     ─────────────────────────────────────────────────────────────── */

  const markdown = {
    escapeText(text) {
      return text
        .replace(/\\/g, "\\\\")
        .replace(/([`*_~[\]])/g, "\\$1");
    },

    inline(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return markdown.escapeText(node.nodeValue || "");
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();
      const inner = Array.from(node.childNodes).map(markdown.inline).join("");

      switch (tag) {
        case "br":     return "  \n";
        case "em":
        case "i":      return inner.trim() ? `*${inner}*` : inner;
        case "strong":
        case "b":      return inner.trim() ? `**${inner}**` : inner;
        case "code":   return inner ? `\`${inner}\`` : inner;
        case "del":
        case "s":
        case "strike": return inner.trim() ? `~~${inner}~~` : inner;
        case "a": {
          const href = node.getAttribute("href") || "";
          return href ? `[${inner}](${href})` : inner;
        }
        case "img": {
          const alt = node.getAttribute("alt") || "";
          const src = node.getAttribute("src") || "";
          return src ? `![${alt}](${src})` : "";
        }
        default: return inner;
      }
    },

    block(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return markdown.escapeText((node.nodeValue || "").trim());
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";

      const tag = node.tagName.toLowerCase();
      const inner = Array.from(node.childNodes).map(markdown.inline).join("");

      const heading = tag.match(/^h([1-6])$/);
      if (heading) {
        const level = Number(heading[1]);
        const text = inner.trim();
        return text ? `${"#".repeat(level)} ${text}` : "";
      }

      if (tag === "blockquote") {
        const text = inner.trim();
        if (!text) return "";
        return text.split("\n").map((l) => `> ${l}`.trimEnd()).join("\n");
      }

      if (tag === "ul" || tag === "ol") {
        const items = Array.from(node.children)
          .filter((c) => c.tagName.toLowerCase() === "li")
          .map((li, i) => {
            const marker = tag === "ol" ? `${i + 1}.` : "-";
            const content = Array.from(li.childNodes)
              .map(markdown.inline).join("")
              .trim()
              .replace(/\n{2,}/g, "\n");
            return `${marker} ${content}`;
          })
          .filter(Boolean);
        return items.join("\n");
      }

      if (tag === "pre") {
        const text = (node.textContent || "").replace(/\n+$/, "");
        return text ? "```\n" + text + "\n```" : "";
      }

      return inner.trim();
    },

    fromHTML(html) {
      if (!html) return "";
      const doc = document.implementation.createHTMLDocument();
      doc.body.innerHTML = html;
      return Array.from(doc.body.childNodes)
        .map(markdown.block)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .join("\n\n");
    },
  };


  /* ───────────────────────────────────────────────────────────────
     4. DOM helpers
     ─────────────────────────────────────────────────────────────── */

  const $ = (id) => document.getElementById(id);

  function plainText(html) {
    if (!html) return "";
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = html;
    return Array.from(doc.body.childNodes)
      .map((n) => (n.textContent || "").trim())
      .filter(Boolean)
      .join("\n\n");
  }

  function escapeHTML(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  /* ───────────────────────────────────────────────────────────────
     5. Toast
     ─────────────────────────────────────────────────────────────── */

  const toast = {
    el: $("toast"),
    timer: null,
    show(message) {
      this.el.textContent = message;
      this.el.classList.add("visible");
      clearTimeout(this.timer);
      this.timer = setTimeout(
        () => this.el.classList.remove("visible"),
        2400
      );
    },
  };


  /* ───────────────────────────────────────────────────────────────
     6. Theme
     ─────────────────────────────────────────────────────────────── */

  const theme = {
    btn: $("theme-toggle"),
    current() {
      return document.documentElement.dataset.theme || "light";
    },
    apply(name) {
      document.documentElement.dataset.theme = name;
      storage.write(THEME_KEY, name);
      const color = name === "dark" ? "#111318" : "#faf5ec";
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((m) => m.setAttribute("content", color));
    },
    toggle() {
      this.apply(this.current() === "dark" ? "light" : "dark");
    },
  };


  /* ───────────────────────────────────────────────────────────────
     7. Greeting
     ─────────────────────────────────────────────────────────────── */

  const greeting = {
    word: $("greeting-word"),
    date: $("greeting-date"),
    refresh() {
      this.word.textContent = dates.greeting();
      this.date.textContent = dates.todayLabel();
    },
  };


  /* ───────────────────────────────────────────────────────────────
     8. Editor
     ─────────────────────────────────────────────────────────────── */

  const editor = {
    el: $("editor"), page: $("page"), saveTimer:null, currentKey:null,
    load(key,{readonly=false}={}){this.currentKey=key;const entry=storage.read(KEY_PREFIX+key);this.el.innerHTML=entry.html;this.el.contentEditable=readonly?"false":"true";this.page.classList.toggle("reading",readonly);this.refreshEmptyState();},
    isEmpty(){return this.el.textContent.trim().length===0;},
    refreshEmptyState(){this.page.classList.toggle("has-content",!this.isEmpty());},
    scheduleSave(){this.refreshEmptyState();saveStatus.hide();closeDay.hide();clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.saveNow(),400);},
    saveNow(){if(this.currentKey!==dates.todayKey())return;if(this.el.contentEditable==="false")return;const key=KEY_PREFIX+this.currentKey;if(this.isEmpty()){const ok=storage.remove(key);if(ok)saveStatus.show();else saveStatus.showError();return;}const existing=storage.read(key),now=new Date().toISOString();const entry={html:this.el.innerHTML.trim(),createdAt:existing.createdAt||now,updatedAt:now};const ok=storage.write(key,entry);if(ok){saveStatus.show();closeDay.schedule();}else saveStatus.showError();},
    focusAtEnd(){this.el.focus();const range=document.createRange();range.selectNodeContents(this.el);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);},
    hasSelection(){const sel=window.getSelection();return sel&&sel.toString().length>0;}
  };


  /* ───────────────────────────────────────────────────────────────
     9. Save status
     ─────────────────────────────────────────────────────────────── */

  const saveStatus = {
    el: $("save-status"),
    text: $("save-text"),
    dot: null,

    show() {
      this.el.classList.remove("error");
      this.text.textContent = "saved";
      this.el.classList.add("visible");
      this.pulseDot();
    },

    showError() {
      this.el.classList.add("error");
      this.text.textContent = "not saved";
      this.el.classList.add("visible");
    },

    hide() {
      this.el.classList.remove("visible");
    },

    pulseDot() {
      if (prefersReducedMotion()) return;
      if (!this.dot) this.dot = this.el.querySelector(".save-status-dot");
      if (!this.dot) return;

      this.dot.classList.remove("pulse");
      void this.dot.offsetWidth;
      this.dot.classList.add("pulse");

      this.dot.addEventListener(
        "animationend",
        () => this.dot.classList.remove("pulse"),
        { once: true }
      );
    },
  };


  const closeDay = {
    el: $("close-day"), timer:null,
    schedule(){this.hide();clearTimeout(this.timer);this.timer=setTimeout(()=>{if(views.current!=="today")return;if(editor.isEmpty())return;this.show();},5000);},
    show(){this.el.hidden=false;requestAnimationFrame(()=>this.el.classList.add("visible"));},
    hide(){this.el.classList.remove("visible");clearTimeout(this.timer);setTimeout(()=>{this.el.hidden=true;},500);},
    trigger(){editor.saveNow();if(window.Sound)Sound.play("close");toast.show("page closed");views.go("history");}
  };


  /* ───────────────────────────────────────────────────────────────
     11. Views
     ─────────────────────────────────────────────────────────────── */

  const views = {
    today: $("view-today"),
    history: $("view-history"),
    historyList: $("history-list"),
    historyCount: $("history-count"),
    navToggle: $("nav-toggle"),
    exportBtn: $("export-btn"),
    pdfBtn: $("pdf-btn"),

    current: "today",
    readingKey: null,
    transitioning: false,

    prepareToday() {
      this.removeReadingBanner();
      greeting.refresh();
      editor.load(dates.todayKey());
      closeDay.hide();
      if (editor.isEmpty()) saveStatus.hide();
      else { saveStatus.show(); closeDay.schedule(); }
    },

    prepareReading(key) {
      greeting.word.textContent = dates.shortLabel(key);
      greeting.date.textContent = dates.relative(key) || "kept page";
      editor.load(key, { readonly: true });
      saveStatus.hide();

      this.removeReadingBanner();

      const banner = document.createElement("div");
      banner.className = "reading-banner";
      banner.id = "reading-banner";
      banner.innerHTML = `
        <span class="reading-banner-label">
          reading <strong>${escapeHTML(dates.shortLabel(key))}</strong>
        </span>
        <button type="button" class="link-btn" id="reading-back">← back</button>
      `;
      editor.page.parentNode.insertBefore(banner, editor.page);

      banner
        .querySelector("#reading-back")
        .addEventListener("click", () => {
          this.removeReadingBanner();
          this.go("history");
        });
    },

    prepareHistory() {
      const keys = storage
        .keysWithPrefix(KEY_PREFIX)
        .sort((a, b) => b.localeCompare(a));

      this.historyList.innerHTML = "";
      this.historyCount.textContent =
        keys.length === 1 ? "1 page" : `${keys.length} pages`;
      this.exportBtn.disabled = keys.length === 0;
      this.pdfBtn.disabled = keys.length === 0;

      if (keys.length === 0) {
        const empty = document.createElement("div");
        empty.className = "history-empty";
        empty.textContent =
          "Nothing written yet. Everything you write here stays.";
        this.historyList.appendChild(empty);
        return;
      }

      const MAX_STAGGER = 8;
      const STAGGER_MS = 50;

      const fragment = document.createDocumentFragment();
      let index = 0;

      for (const key of keys) {
        const entry = storage.read(KEY_PREFIX + key);
        const text = plainText(entry.html);
        if (!text) continue;

        const preview =
          text.length > 180 ? text.slice(0, 180) + "…" : text;
        const relative = dates.relative(key);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "entry";
        btn.style.setProperty(
          "--stagger-delay",
          `${Math.min(index, MAX_STAGGER - 1) * STAGGER_MS}ms`
        );
        btn.innerHTML = `
          <div class="entry-date">
            ${escapeHTML(dates.shortLabel(key))}
            ${relative ? `<span class="entry-when">${escapeHTML(relative)}</span>` : ""}
          </div>
          <div class="entry-preview">${escapeHTML(preview)}</div>
        `;
        btn.addEventListener("click", () => this.go("reading", key));

        fragment.appendChild(btn);
        index++;
      }

      this.historyList.appendChild(fragment);
    },

    go(view, key = null) {
      if (this.transitioning) return;

      if (this.current === "today" && view !== "today") {
        editor.saveNow();
      }

      const fromEl = this.current === "history" ? this.history : this.today;
      const toEl = view === "history" ? this.history : this.today;

      this.current = view;
      this.readingKey = view === "reading" ? key : null;

      if (view === "today") this.prepareToday();
      else if (view === "reading") this.prepareReading(key);
      else if (view === "history") this.prepareHistory();

      this.navToggle.textContent =
        view === "today" ? "earlier pages"
        : view === "history" ? "← today"
        : "← earlier pages";

      if (window.Sound) Sound.play(view === "today" ? "open" : "page");

      if (fromEl === toEl || fromEl.hidden) {
        toEl.hidden = false;
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }

      if (prefersReducedMotion()) {
        fromEl.hidden = true;
        toEl.hidden = false;
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }

      this.transitioning = true;

      const FADE_OUT = 160;
      const FADE_IN = 200;

      fromEl.classList.add("view-fade-out");

      setTimeout(() => {
        fromEl.classList.remove("view-fade-out");
        fromEl.hidden = true;

        toEl.hidden = false;
        window.scrollTo({ top: 0, behavior: "instant" });
        toEl.classList.add("view-fade-in");

        this.transitioning = false;

        setTimeout(() => {
          toEl.classList.remove("view-fade-in");
        }, FADE_IN);
      }, FADE_OUT);
    },

    removeReadingBanner() {
      const b = document.getElementById("reading-banner");
      if (b) b.remove();
    },
  };


  /* ───────────────────────────────────────────────────────────────
     11. Export
     ─────────────────────────────────────────────────────────────── */

  function exportMarkdown() {
    const keys = storage
      .keysWithPrefix(KEY_PREFIX)
      .sort((a, b) => b.localeCompare(a));

    if (keys.length === 0) {
      toast.show("nothing to export yet");
      return;
    }

    const lines = [
      "# Blank archive",
      "",
      `Exported ${dates.longLabel(dates.todayKey())}.`,
      "",
    ];

    let included = 0;

    for (const key of keys) {
      const entry = storage.read(KEY_PREFIX + key);
      const body = markdown.fromHTML(entry.html);
      if (!body) continue;

      included++;
      lines.push("---", "");
      lines.push(`## ${dates.longLabel(key)}`, "");
      lines.push(body, "");
    }

    if (included === 0) {
      toast.show("nothing to export yet");
      return;
    }

    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `blank-archive-${dates.todayKey()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast.show(`exported ${included} ${included === 1 ? "page" : "pages"}`);
  }


  function exportPDF() {
    const keys=storage.keysWithPrefix(KEY_PREFIX).sort((a,b)=>a.localeCompare(b));
    if(!keys.length){toast.show("nothing to export yet");return;}
    const entries=[];
    for(const key of keys){const entry=storage.read(KEY_PREFIX+key),body=markdown.fromHTML(entry.html);if(body)entries.push({key,body,date:dates.longLabel(key),time:dates.timeLabel(entry.updatedAt)});}
    if(!entries.length){toast.show("nothing to export yet");return;}
    const html=buildPrintDocument(entries,theme.current());
    const win=window.open("","_blank");
    if(!win){toast.show("allow pop-ups to save as PDF");return;}
    win.document.open();win.document.write(html);win.document.close();
    const trigger=()=>{try{win.focus();win.print();}catch{}};
    if(win.document.readyState==="complete")setTimeout(trigger,400);else win.addEventListener("load",()=>setTimeout(trigger,400),{once:true});
  }
  function buildPrintDocument(entries,currentTheme){
    const total=entries.length,pages=entries.map((entry,i)=>{const n=String(i+1).padStart(2,"0"),time=entry.time?`<p class="pdf-time">written at ${escapeHTML(entry.time)}</p>`:"",body=entry.body.split("\n\n").map(p=>`<p>${escapeHTML(p).replace(/\n/g,"<br>")}</p>`).join("");return `<article class="pdf-page"><header class="pdf-head"><p class="pdf-date">${escapeHTML(entry.date)}</p>${time}</header><div class="pdf-body">${body}</div><footer class="pdf-foot"><span class="pdf-mark">blank<span class="pdf-dot">.</span></span><span class="pdf-num">${n} / ${String(total).padStart(2,"0")}</span></footer></article>`;}).join("");
    return `<!doctype html><html lang="en" data-theme="${currentTheme==="dark"?"dark":"light"}"><head><meta charset="utf-8"/><title>Blank — ${escapeHTML(dates.longLabel(dates.todayKey()))}</title><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet"/><style>${printStyles()}</style></head><body><div class="print-bar"><span>use your browser's <strong>Save as PDF</strong> in the print dialog</span><button type="button" onclick="window.print()">print again</button></div>${pages}</body></html>`;
  }
  function printStyles(){return `:root,[data-theme="light"]{--paper:#faf5ec;--card:#fffdf8;--ink:#2a2520;--ink-2:#544d42;--muted:#968a76;--line:#ebe3d1;--warm:#c47a3f;--warm-soft:rgba(196,122,63,.07)}[data-theme="dark"]{--paper:#111318;--card:#1a1e24;--ink:#e8e6e1;--ink-2:#a9a9ab;--muted:#6b7076;--line:#22262d;--warm:#d9a679;--warm-soft:rgba(217,166,121,.08)}:root{--display:"Fraunces",ui-serif,Georgia,serif;--serif:"Newsreader",ui-serif,Georgia,serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.print-bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1.5rem;background:var(--card);border-bottom:1px solid var(--line);font-family:var(--mono);font-size:.72rem;letter-spacing:.06em;color:var(--muted)}.print-bar strong{color:var(--warm);font-weight:400}.print-bar button{font:inherit;padding:.4rem .85rem;border:1px solid var(--line);border-radius:999px;color:var(--muted);background:transparent;cursor:pointer}.pdf-page{max-width:720px;margin:2.5rem auto;padding:3rem 3.25rem 2.5rem;background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.03),0 12px 40px rgba(0,0,0,.05);display:flex;flex-direction:column;min-height:26rem}.pdf-head{padding-bottom:1.25rem;margin-bottom:1.75rem;border-bottom:1px solid var(--line)}.pdf-date{font-family:var(--display);font-size:1.5rem;line-height:1.15;color:var(--ink);margin-bottom:.35rem}.pdf-time{font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.pdf-body{font-family:var(--serif);font-size:1.05rem;line-height:1.75;color:var(--ink);flex:1}.pdf-body p{margin:0 0 1.15em}.pdf-foot{display:flex;align-items:baseline;justify-content:space-between;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--line);font-family:var(--mono);font-size:.65rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.pdf-mark{font-family:var(--display);font-size:.85rem;color:var(--ink)}.pdf-dot{color:var(--warm)}@page{size:A4;margin:18mm 16mm}@media print{.print-bar{display:none!important}html,body{background:var(--paper)!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pdf-page{max-width:none;margin:0;padding:0;background:transparent;border:0;border-radius:0;box-shadow:none;min-height:0;page-break-after:always;break-after:page}.pdf-page:last-child{page-break-after:auto;break-after:auto}.pdf-body{font-size:11.5pt;line-height:1.7}.pdf-foot{position:fixed;bottom:0;left:0;right:0;padding:0;margin:0;border-top:0}}`.trim();}


  /* ───────────────────────────────────────────────────────────────
     14. Events
     ─────────────────────────────────────────────────────────────── */

  editor.el.addEventListener("input", () => editor.scheduleSave());

  editor.el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      try {
        document.execCommand("defaultParagraphSeparator", false, "p");
        document.execCommand("insertParagraph", false);
      } catch {
        document.execCommand("insertLineBreak");
      }
    }
  });

  editor.el.addEventListener("paste", (e) => {
    e.preventDefault();
    const raw = (e.clipboardData.getData("text/plain") || "").replace(
      /\r\n/g,
      "\n"
    );
    if (!raw) return;

    if (!raw.includes("\n")) {
      document.execCommand("insertText", false, raw);
      return;
    }

    const paragraphs = raw
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const html = paragraphs
      .map((p) => `<p>${escapeHTML(p).replace(/\n/g, "<br>")}</p>`)
      .join("");

    document.execCommand("insertHTML", false, html);
  });

  closeDay.el.addEventListener("click", () => closeDay.trigger());

  editor.page.addEventListener("click", (e) => {
    if (views.current !== "today") return;
    if (editor.el.contains(e.target)) return;
    if (editor.hasSelection()) return;
    editor.focusAtEnd();
  });

  views.navToggle.addEventListener("click", () => {
    if (views.current === "today") views.go("history");
    else if (views.current === "history") views.go("today");
    else views.go("history");
  });

  theme.btn.addEventListener("click", () => theme.toggle());

  const soundToggle=document.getElementById("sound-toggle");
  if(soundToggle&&window.Sound){soundToggle.addEventListener("click",()=>{const on=Sound.toggle();document.documentElement.classList.toggle("sound-on",on);soundToggle.setAttribute("aria-pressed",String(on));if(on)Sound.play("page");});}

  views.exportBtn.addEventListener("click", exportMarkdown);
  views.pdfBtn.addEventListener("click", exportPDF);

  window.addEventListener("beforeunload", () => {
    if (views.current === "today") editor.saveNow();
  });

  setInterval(() => {
    if (views.current === "today") greeting.refresh();
  }, 5 * 60 * 1000);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }


  /* ───────────────────────────────────────────────────────────────
     15. Boot
     ─────────────────────────────────────────────────────────────── */

  if(window.Sound){Sound.boot();if(Sound.isEnabled()){document.documentElement.classList.add("sound-on");const btn=document.getElementById("sound-toggle");if(btn)btn.setAttribute("aria-pressed","true");}}

  views.go("today");

  if (!prefersReducedMotion()) {
    document.documentElement.classList.add("arriving");
    setTimeout(() => {
      document.documentElement.classList.remove("pre-arrival", "arriving");
    }, 1000);
  } else {
    document.documentElement.classList.remove("pre-arrival");
  }
})();