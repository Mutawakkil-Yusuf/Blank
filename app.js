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
      try { return localStorage.getItem(key) || ""; }
      catch { return ""; }
    },
    write(key, value) {
      try { localStorage.setItem(key, value); return true; }
      catch { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(key); return true; }
      catch { return false; }
    },
    keysWithPrefix(prefix) {
      const keys = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keys.push(k.slice(prefix.length));
        }
      } catch {}
      return keys;
    },
  };


  /* ───────────────────────────────────────────────────────────────
     2. Dates
     ─────────────────────────────────────────────────────────────── */

  const dates = {
    todayKey(d = new Date()) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    todayLabel(d = new Date()) {
      const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
      const month = d.toLocaleDateString("en-US", { month: "long" });
      return `${weekday} · ${month} ${d.getDate()}`;
    },
    longLabel(key) {
      return parseKey(key).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    },
    shortLabel(key) {
      const date = parseKey(key);
      const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
      const month = date.toLocaleDateString("en-US", { month: "short" });
      return `${weekday}, ${month} ${date.getDate()}`;
    },
    relative(key) {
      const date = parseKey(key);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = Math.round((today - date) / 86400000);
      if (days === 1) return "yesterday";
      if (days === 2) return "2 days ago";
      if (days === 3) return "3 days ago";
      if (days < 7) return `${days} days ago`;
      return "";
    },
    greeting(hour = new Date().getHours()) {
      if (hour >= 5 && hour < 12) return "Good morning";
      if (hour >= 12 && hour < 17) return "Good afternoon";
      if (hour >= 17 && hour < 22) return "Good evening";
      return "A quiet night";
    },
  };

  function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }


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
    el: $("editor"),
    page: $("page"),
    saveTimer: null,
    currentKey: null,

    load(key, { readonly = false } = {}) {
      this.currentKey = key;
      this.el.innerHTML = storage.read(KEY_PREFIX + key);
      this.el.contentEditable = readonly ? "false" : "true";
      this.page.classList.toggle("reading", readonly);
      this.refreshEmptyState();
    },

    isEmpty() {
      return this.el.textContent.trim().length === 0;
    },

    refreshEmptyState() {
      this.page.classList.toggle("has-content", !this.isEmpty());
    },

    scheduleSave() {
      this.refreshEmptyState();
      saveStatus.hide();
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveNow(), 400);
    },

    saveNow() {
      if (this.currentKey !== dates.todayKey()) return;
      if (this.el.contentEditable === "false") return;

      const html = this.el.innerHTML.trim();
      const ok = this.isEmpty()
        ? storage.remove(KEY_PREFIX + this.currentKey) === true
        : storage.write(KEY_PREFIX + this.currentKey, html);

      if (ok) saveStatus.show();
      else saveStatus.showError();
    },

    focusAtEnd() {
      this.el.focus();
      const range = document.createRange();
      range.selectNodeContents(this.el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    },

    hasSelection() {
      const sel = window.getSelection();
      return sel && sel.toString().length > 0;
    },
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


  /* ───────────────────────────────────────────────────────────────
     10. Views
     ─────────────────────────────────────────────────────────────── */

  const views = {
    today: $("view-today"),
    history: $("view-history"),
    historyList: $("history-list"),
    historyCount: $("history-count"),
    navToggle: $("nav-toggle"),
    exportBtn: $("export-btn"),

    current: "today",
    readingKey: null,
    transitioning: false,

    prepareToday() {
      this.removeReadingBanner();
      greeting.refresh();
      editor.load(dates.todayKey());

      if (editor.isEmpty()) saveStatus.hide();
      else saveStatus.show();
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
        const html = storage.read(KEY_PREFIX + key);
        const text = plainText(html);
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

  function exportArchive() {
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
      const html = storage.read(KEY_PREFIX + key);
      const body = markdown.fromHTML(html);
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


  /* ───────────────────────────────────────────────────────────────
     12. Events
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

  views.exportBtn.addEventListener("click", exportArchive);

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
     13. Boot
     ─────────────────────────────────────────────────────────────── */

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
