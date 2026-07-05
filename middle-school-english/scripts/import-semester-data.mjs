import fs from "node:fs";
import path from "node:path";

const [sourceDirectory, outputDirectory] = process.argv.slice(2);

if (!sourceDirectory || !outputDirectory) {
  throw new Error("Usage: node import-semester-data.mjs <source-directory> <output-directory>");
}

const sources = {
  "grade-7-1": { file: "grade7a.json" },
  "grade-7-2": { file: "grade7b.json" },
  "grade-8-1": { file: "grade8a.json" },
  "grade-8-2": { file: "grade8b.json" },
  "grade-9-1": { file: "grade9.json", units: [0, 7], volume: "上学期（Unit 1–7）" },
  "grade-9-2": { file: "grade9.json", units: [7, 14], volume: "下学期（Unit 8–14）" },
};

for (const [semester, config] of Object.entries(sources)) {
  const inputPath = path.join(sourceDirectory, config.file);
  const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const selectedUnits = config.units
    ? source.units.slice(config.units[0], config.units[1])
    : source.units;

  const output = {
    semester,
    title: `${source.grade}${config.volume ?? source.volume}`,
    source: "henry1786580051-lang/english-test (MIT)",
    units: selectedUnits.map((unit, unitIndex) => ({
      name: unit.unit,
      words: unit.words.map((entry, wordIndex) => ({
        id: `${semester}-${unitIndex + 1}-${wordIndex + 1}`,
        word: entry.english.trim(),
        meaning: entry.chinese.trim(),
        partOfSpeech: entry.partOfSpeech || "",
      })),
    })),
  };

  const targetDirectory = path.join(outputDirectory, semester);
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(targetDirectory, "words.json"),
    `${JSON.stringify(output, null, 2)}\n`,
  );

  const count = output.units.reduce((total, unit) => total + unit.words.length, 0);
  console.log(`${semester}: ${output.units.length} units, ${count} entries`);
}
