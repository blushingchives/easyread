/*
 * Easy Reader transform.
 *
 * Bolds the leading letters of each word so the eye can recognise it from a
 * fragment and jump on. Three parameters:
 *   fixation  1-5   how much of a word is set in bold (base 3)
 *   saccade   10-50 the visual jump from one highlight to the next (base 10)
 *   opacity         how visible the non-bolded remainder is
 *
 * Fixation is word-length aware: the bolded head is a fraction of the word,
 * always at least one letter and never the whole word (a word with no plain
 * tail gives the eye nothing to jump to).
 */

const FIXATION_RATIO = [0.30, 0.40, 0.50, 0.60, 0.70]; // index = fixation - 1

// Letters/digits, keeping internal apostrophes so "don't" stays one word.
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ESC[c]);

/** Number of leading characters to bold for a word at a given fixation. */
function headLength(word, fixation) {
  const n = word.length;
  if (n <= 1) return n;
  let c = Math.min(Math.max(Math.ceil(n * FIXATION_RATIO[fixation - 1]), 1), n - 1);
  // Never end the bold head on an apostrophe: "don't" bolds "don", not "don'".
  if (c > 1 && /['’]/.test(word[c - 1])) c--;
  return c;
}

/** Saccade 10..50 -> how many words to leave untouched between highlights. */
const saccadeSkip = (saccade) => Math.round((saccade - 10) / 10);

/**
 * Convert plain text to easy-read HTML.
 *
 * Returns two renderings built in a single pass:
 *   preview   for the on-screen pane (dimming via a CSS class)
 *   clipboard tag-minimal HTML for pasting elsewhere — no font-family, so the
 *             destination document keeps its own typeface
 */
function toEasyRead(text, { fixation = 3, saccade = 10, dimOnCopy = false, dimColor = '#6f6f6f' } = {}) {
  const skip = saccadeSkip(saccade);
  const preview = [];
  const clipboard = [];
  let wordIndex = 0;
  let wordCount = 0;

  for (const line of text.split(/\r\n|\r|\n/)) {
    if (!line.trim()) {
      preview.push('<div class="ln"></div>');
      clipboard.push('<div><br></div>');
      continue;
    }

    let p = '';
    let c = '';
    let last = 0;
    WORD_RE.lastIndex = 0;
    let m;

    while ((m = WORD_RE.exec(line)) !== null) {
      const gap = escapeHtml(line.slice(last, m.index));
      p += gap;
      c += gap;
      last = m.index + m[0].length;

      const word = m[0];
      wordCount++;
      const highlight = skip === 0 || wordIndex % (skip + 1) === 0;
      wordIndex++;

      if (!highlight) {
        const plain = escapeHtml(word);
        p += `<span class="rest">${plain}</span>`;
        c += dimOnCopy ? `<span style="color:${dimColor}">${plain}</span>` : plain;
        continue;
      }

      const h = headLength(word, fixation);
      const head = escapeHtml(word.slice(0, h));
      const tail = escapeHtml(word.slice(h));

      p += `<b>${head}</b>` + (tail ? `<span class="rest">${tail}</span>` : '');
      c += `<b>${head}</b>` +
           (tail ? (dimOnCopy ? `<span style="color:${dimColor}">${tail}</span>` : tail) : '');
    }

    const trailing = escapeHtml(line.slice(last));
    preview.push(`<div class="ln">${p}${trailing}</div>`);
    clipboard.push(`<div>${c}${trailing}</div>`);
  }

  return { preview: preview.join(''), clipboard: clipboard.join(''), wordCount };
}
