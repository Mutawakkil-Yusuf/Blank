# Blank

A quiet place to write.

One page. One text field. No accounts, no sync, no cloud. It saves to your
device and waits for you to come back.

## Why

Every notes app starts simple and grows folders, tags, prompts, streaks,
templates. Blank removes the system so you can just write. It is a diary
with the features taken out.

The archive keeps what you wrote, dated, read-only. You can reread it. You
cannot rewrite it. That is the only rule.

## Running it

**Locally.** Open `index.html` in a browser. It works from the filesystem.

**As an app.** Serve the folder from any static host:

```
npx serve .
```

Then open the URL and use **Install** in your browser. The icon appears on
your home screen and works offline.

**Free hosting.** Drop the folder on Netlify Drop, Cloudflare Pages,
Vercel, or GitHub Pages. No build step. No configuration. No environment
variables.

## Files

```
index.html      the app
styles.css      all styling
app.js          all behavior
manifest.json   PWA metadata
sw.js           service worker (offline)
icon.svg        app icon
```

No framework. No bundler. No dependencies. Plain HTML, CSS, and JavaScript.

## Data

Everything lives in `localStorage` on the device.

```
blank_entry_YYYY-MM-DD    the writing for that day
blank_theme               "light" or "dark"
```

Nothing leaves the device. Clearing browser data deletes everything. If you
want a backup, use **export** in the history view — it downloads every
entry as a single Markdown file.

## Keyboard

```
⌘/Ctrl + I     italic
⌘/Ctrl + B     bold
Enter          new paragraph
Shift + Enter  line break inside the current paragraph
```

## Not included

Accounts. Sync. Sharing. Prompts. Streaks. Notifications. Themes beyond
light and dark. AI. Anything that would turn writing into maintenance.

## License

MIT.
