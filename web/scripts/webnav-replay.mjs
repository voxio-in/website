// Print a browser snippet that replays an eval's actions against the real page.
//
// The agent never sees the page, so the only honest test of its actions is to
// run them on the page, in order, with the same hands the live demo uses. This
// writes a script to paste into the /webnav tab's console (dev build, where
// window.__waPerform is exposed). It selects each conversation's site, runs
// every action, and stores the outcome of each in window.__replay.
//
//   node scripts/webnav-replay.mjs eval/webnav-<stamp>.json > eval/replay.js

import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) throw new Error('usage: node scripts/webnav-replay.mjs eval/webnav-<stamp>.json')
const results = JSON.parse(readFileSync(file, 'utf8'))

const LABEL = { rail: 'train', shop: 'shop', clinic: 'hospital', university: 'university' }

const convs = results
  .filter((r) => r.turns?.length)
  .map((r, i) => ({ i, site: r.site, model: r.model, turns: r.turns.map((t) => t.actions) }))

console.log(`(async () => {
  const convs = ${JSON.stringify(convs)};
  const LABEL = ${JSON.stringify(LABEL)};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__replay = [];
  for (const c of convs) {
    // Flip to another site and back, so every conversation starts on a fresh page.
    const seg = (w) => [...document.querySelectorAll('.seg-o')].find((b) => b.textContent.includes(w));
    seg(c.site === 'shop' ? 'train' : 'shop').click(); await sleep(300);
    seg(LABEL[c.site]).click(); await sleep(600);
    const out = { i: c.i, site: c.site, model: c.model, turns: [] };
    for (const actions of c.turns) {
      const t = [];
      for (const a of actions) t.push([await window.__waPerform(a), a.action, a.target ?? a.selector, a.within ?? '', a.value ?? '']);
      out.turns.push(t);
    }
    window.__replay.push(out);
  }
  window.__replayDone = true;
})();`)
