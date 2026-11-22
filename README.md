# syoon291.github.io

Steven Yoon's personal site: https://syoon291.github.io/

| Path | What it is |
| --- | --- |
| `/` | Home: the apps I use every day (Nihongo Ears, genki, Freedom Calculator, tane), each a card with a phone screenshot and status |
| `/about/`, `/work/`, `/skills/`, `/contact/` | Background and timeline, things I've built, toolbox, and contact, each its own page reached from the Menu pane in every header |
| `/tools/freedom/` | Freedom calculator: freedom number, monthly saving needed, year-by-year projection |
| `/workout/` | Liftlog, a data-driven workout planner, now superseded by genki but kept reachable (the 2023 version is kept at `/workout/legacy/`) |
| [`/nihongo/`](https://syoon291.github.io/nihongo/) | Nihongo Ears, a Japanese speaking and listening app ([its own repo](https://github.com/syoon291/nihongo), served under this domain and linked from every page's nav) |
| [`/genki/`](https://syoon291.github.io/genki/) | genki, a personal nutrition and workout tracker ([its own repo](https://github.com/syoon291/genki), served under this domain; the Work page's Liftlog links point here) |

Plain HTML, CSS and JavaScript: no build step. Edit and push to `main`; GitHub Pages publishes it.
Shared styles are in `site.css`, the theme toggle and Menu pane in `site.js` (the header and menu markup is repeated in each page), and the home cards' app screenshots in `img/projects/` (taken with empty or demo data, never personal data).

Spots that still need real details are marked with `TODO` comments in `about/`, `work/` and `contact/`.
