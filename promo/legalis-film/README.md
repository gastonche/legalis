# Legalis — "Where the Law Stands" (60s hero film)

A Remotion-built vertical (1080×1920) marketing film for Legalis. No voiceover by
design: serif on-screen statements carry the narrative (language-neutral for a
bilingual audience); the sound design is entirely free assets — a tension drone
generated with ffmpeg (`public/drone.wav`) plus the free remotion.media SFX
(switch/ding/whoosh/page-turn/mouse-click).

## The psychological arc

uncertainty → authority → honesty → relief

1. **Noise (0–6s)** — contradictory "advice" fragments; loss aversion + self-reference.
2. **Statement (6–9s)** — hard cut to silence: "The law has an answer. Rumour isn't it."
3. **Question (9–15s)** — the product composer, typed in the viewer's words (concreteness).
4. **The law arrives (15–26s)** — streamed answer; Labour Code §36 cited verbatim,
   the brass "primary" seal (authority shown, not claimed).
5. **Checked before showing (26–32s)** — four rising ticks + the Verified chime
   (operational transparency).
6. **The refusal (32–38s)** — "I can't ground this — so I won't guess." The pratfall
   effect: admitting limits makes the Verified believable.
7. **Both Cameroons (38–46s)** — FR question → OHADA; the bijural chips (social identity).
8. **The boundary (46–54s)** — "Information first. Lawyers where it matters." (reactance reduction).
9. **CTA (54–60s)** — the seal stamps, legalis.cm, free during beta (peak-end).

## Commands

```bash
npm install
npx remotion studio                                   # preview
npx remotion render LegalisFilm out/legalis-film.mp4  # render
```

Regenerate the drone: see the ffmpeg one-liner in the repo history (sine 52Hz +
brown noise, lowpass, tremolo, fade-in).
