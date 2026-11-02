# HYROX Planner

Plan HYROX sessions and run them with a phone-first gym timer. Static files only: no build step, no server, no database. Workouts and session history live in the browser's `localStorage` on each device.

## What's in it

- **Workouts list** (`#/`): start, edit, copy, export (JSON) or delete a workout. Import a JSON file, or export everything as one file. Use this to move workouts between your phone and laptop.
- **Editor** (`#/new`, `#/edit/:id`): a workout is a list of blocks:
  - **Timed piece**: one countdown (warm-up, cool-down).
  - **Every X min**: every n minutes for R rounds (E3MOM, E3:30MOM…).
  - **EMOM stations**: rotating stations, one per interval, for R rounds.
  - **AMRAP**: one countdown with a round counter.
  Tasks are one per line; put the weight or reps after a `|`, e.g. `Sled pull 25 m | 103 kg total`.
- **Timer** (`#/run/:id`): the timer from `hyrox-timer.html` (holds between blocks, get-ready countdown, ±10 s, back/skip, beeps, wake lock). New: steps that end while the screen is off are caught up when it wakes, and the done screen offers a CSV of split times. Finished sessions are saved to history.
- **PWA**: add it to your home screen; it works offline after the first visit.

## Files

```
index.html            app shell
css/app.css           styles (dark only)
js/app.js             hash router + service worker registration
js/session.js         workout format, buildSession(), durations
js/seed.js            the workout loaded on first visit
js/store.js           localStorage: workouts, history, settings
js/library.js         workouts list
js/editor.js          workout editor
js/timer.js           the timer
sw.js                 offline cache
manifest.webmanifest  home-screen app details
CNAME                 custom domain for GitHub Pages
```

## Run locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. The service worker is skipped on `localhost`, so changes show on reload.

## Deploy (GitHub Pages + Porkbun)

1. Push this folder to a GitHub repository and turn on Pages (Settings → Pages → Deploy from branch → `main`, `/ (root)`).
2. In Porkbun DNS for `boredboytech.com`, the `hyrox` host needs one record:
   `CNAME  hyrox  →  <your-github-username>.github.io`
   Remove any A record for `hyrox` first; a host can't have both.
3. In the repo's Pages settings, the custom domain should read `hyrox.boredboytech.com` (the `CNAME` file sets it). Tick **Enforce HTTPS** once the certificate is issued (usually within an hour).

After that, every push to `main` redeploys. Phones pick up the new version on the next launch after opening it once (the offline cache refreshes in the background).
