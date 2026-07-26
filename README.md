# Easy Reader

Converts plain text into an easier-to-read format — the first few letters of each word
set in bold — with no length limit. Two panes: input on the left, output on the right.

Open `index.html` in a browser. No build step, no dependencies, no server needed.

## Copy fidelity

The **Copy** button writes two flavours to the clipboard at once:

- `text/html` — tag-minimal markup, `<b>` and line `<div>`s only
- `text/plain` — the original text, for editors that ignore formatting

Because the HTML declares no `font-family`, `font-size` or `color`, Word, PowerPoint,
Google Docs and Google Slides apply their own document font on paste and only the
bolding carries over.

`Dim on copy` (off by default) additionally carries the faded remainder across as a
grey colour. Leave it off if you want the destination document's text colour untouched.

## Controls

| Control | Range | Effect |
| --- | --- | --- |
| Fixation | 1–5 (base 3) | How much of each word is bolded — 30% to 70% of its length, word-length aware, always leaving at least one plain character |
| Saccade | 10–50 (base 10) | The visual jump between fixations; above 10, words are skipped between highlights |
| Opacity | 20–100% | Visibility of the non-bolded remainder (screen only unless *Dim on copy* is set) |

## Presets

The page always opens on the defaults — fixation 3, saccade 10, opacity 60%, dim off.
**Save** stores the current settings as one of **three** slots, shown as clickable chips
(`F3 · S10 · 60%`); click a chip to load it, click its `×` to delete it. Saving with all
three slots full leaves them untouched and toasts *"All 3 preset slots are full — delete
one first"*. Saving settings that match an existing slot is refused too, so a duplicate
can't burn a slot.

Presets, the input text and the theme persist in `localStorage`; the slider positions
themselves deliberately do not.

## Files

- `index.html` — markup
- `styles.css` — light/dark theme
- `reader.js` — the transform (`toEasyRead`), independent of the DOM
- `app.js` — wiring, clipboard, file drop, scroll sync
