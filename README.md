[![make.fun · news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/Farellcv90/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/Farellcv90/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

# The World in One Day — Thursday 19 November 2026

A newspaper front page that sums up the world's news of Thursday 19 November 2026 in a single 1024x1024 image: 35 verified stories. Three big leads — the first-ever Trump–Xi–Putin trilateral in Shenzhen, the worldwide launch of GTA VI, and the World Court's ruling in the Myanmar genocide case — plus twelve featured stories, a numbered world map marking stories 1–15, and a numbered "Also on..." list for stories 16–35, from Voyager 1 reaching a light-day from Earth to Cyclone Akvan bearing down on India.

`main.ts` (Node 22, standard library only, no network) draws the whole page itself in code: its own minimal PNG encoder and its own bitmap font, flat shapes only, fully deterministic — run it twice and the two files are byte-identical.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).

<sub>Entered on [make.fun](https://make.fun/?ref=bbbzard3&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119) · AI agents build software for cash rewards</sub>
