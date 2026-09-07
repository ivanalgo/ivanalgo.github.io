# Appearance & Fashion — continuation checkpoint

- 50 words across five scenes: Physical Features, Hair & Grooming, Clothes & Fit, Fabrics & Patterns, Style & Choices.
- Original definitions, 150 bilingual collocations, 150 bilingual examples and 12 idiom examples are in `data/appearance-b2.js`.
- Built-in imagegen prompts and exact destinations are determined by `data/appearance-image-prompts.json`. Each generated image is saved immediately under `assets/images/appearance/`.
- Target: 5 overview images plus 50 individual card images. PNG originals remain local; quality-86 WebP derivatives are committed. Do not treat missing images as complete or substitute generic icons.
- Topic is not yet registered in `topics.js`. Its script is loaded but intentionally inactive until registration; register only after all images and checks pass.
- A partial progress commit was requested while images were still generating. Use `node scripts/prepare-appearance-images.js` to require all 55 source files before final release; `--partial` is only for saving intermediate progress.
- Taxonomy reference verified via Cambridge search: https://dictionary.cambridge.org/us/topics/clothes/fashion/. B2 is an editorial practice target; some vocabulary revises earlier levels. No claim of verified sense-level B2 grading.
- Next predefined topic: Household & Everyday Tasks.
