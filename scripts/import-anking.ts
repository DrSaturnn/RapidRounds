import {
  importAnKingDirectory,
  importAnKingFile,
  writeAnKingImportReports
} from "@/lib/anking-enrichment";

function valueAfter(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = valueAfter("--file");
const directory = valueAfter("--directory");
const outputDirectory = valueAfter("--out") ?? "reports";

if ((!file && !directory) || (file && directory)) {
  console.error("Usage: pnpm import:anking --file path/to/anking.txt");
  console.error("   or: pnpm import:anking --directory ./anking-export");
  process.exit(1);
}

const report = file ? importAnKingFile(file) : importAnKingDirectory(directory!);
writeAnKingImportReports(report, outputDirectory);

console.log([
  "AnKing import complete",
  `sources: ${report.sourceCount}`,
  `cards: ${report.cardCount}`,
  `facts: ${report.factCount}`,
  `warnings: ${report.warnings.length}`
].join("\n"));
