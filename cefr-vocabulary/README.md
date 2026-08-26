# CEFR Visual Vocabulary

A no-build, static visual vocabulary lab for GitHub Pages. It includes ten B2 topics: Music, Travel, Work, Technology, Environment, Health, Society, Science, Education and Communication. Each topic provides 50 vocabulary senses across five semantic scenes, with original bilingual definitions and examples, collocations, related words and reusable idiom cards.

## Architecture

- `index.html`, `styles.css`, `app.js`: generic UI and renderer.
- `data/topics.js`: lightweight topic registry.
- `data/music-b2.js`: sense-level English vocabulary records.
- `data/music-b2-zh.js`: Chinese collocation notes, base example translations and music idioms.
- `data/music-b2-examples.js`: two additional bilingual examples per vocabulary sense.
- `data/scenes-music-b2.js`: our pedagogical scene layer and overlay coordinates.
- `data/additional-b2.js`: base topic packs for Travel, Work, Technology, Environment and Health.
- `data/*-b2-expanded.js`: topic-specific expansions that bring every topic to 50 senses and five scenes.
- `data/remaining-b2-topics.js`: complete packs for Society, Science, Education and Communication.
- `assets/images/<topic>/`: generated illustration assets and provenance metadata.
- `image-prompts/<topic>/`: generation direction.
- `scripts/validate-data.js`: optional dependency-free validator.

The source taxonomy and learning scenes are intentionally separate. `topic.subtopic` records the Cambridge SMART Vocabulary reference area; `scenes` records this project's learning design. Definitions, translations and examples are original.

## Vocabulary and evidence model

Each item has a stable sense ID, headword/display form, part of speech, IPA, one `sense` with English and Chinese meanings, a sense-level CEFR label and `cefrEvidence`, collocations, examples, related sense IDs, source topic, scenes and search tags. Evidence status is `verified`, `inferred`, or `uncertain`; inferred entries never claim Cambridge verification.

## Add a topic incrementally

1. Add only `<topic>-<level>.js` and `scenes-<topic>-<level>.js`.
2. Add one entry to `topics.js`.
3. Add scene artwork and prompt notes under the topic folders.
4. Include the two data scripts in `index.html` until dynamic manifests are needed.
5. Run the validator and test the static site. The renderer does not need a topic-specific page.

The site is fully static. It does not store learning status or use `localStorage`; pronunciation uses the browser's built-in British English speech synthesis.

Every topic is rendered by the same shared interface and is divided into five scene cards, two example decks, two idiom decks and an optional All view. Speech synthesis prefers an enhanced or natural British English system voice and uses a slower reading rate.

## Test locally

From the repository root:

```bash
node cefr-vocabulary/scripts/validate-data.js
python3 -m http.server 8000
```

Open `http://localhost:8000/cefr-vocabulary/`. The GitHub Pages path is `https://ivanalgo.github.io/cefr-vocabulary/`.
