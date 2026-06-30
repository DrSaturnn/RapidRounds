import {
  acquireCurriculum,
  formatCurriculumAcquisitionSummary,
  writeCurriculumAcquisitionReports
} from "@/lib/curriculum-acquisition";

function valueAfter(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const file = valueAfter("--file");
const directory = valueAfter("--directory");
const outputDirectory = valueAfter("--out") ?? "reports";

if ((!file && !directory) || (file && directory)) {
  console.error("Usage: pnpm acquire:curriculum --file path/to/file.pdf");
  console.error("   or: pnpm acquire:curriculum --directory ./curriculum");
  process.exit(1);
}

const report = acquireCurriculum({ file, directory });
writeCurriculumAcquisitionReports(report, outputDirectory);
console.log(formatCurriculumAcquisitionSummary(report));
