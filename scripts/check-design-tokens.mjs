import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const srcRoot = join(root, "src");
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);

const paletteUtilityPattern =
  /\b(?:text|bg|border|ring|fill|stroke|divide|outline|decoration|placeholder|caret|accent|shadow)-(?:red|green|blue|yellow|amber|orange|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)(?:-\d{2,3})?(?:\/\d{1,3})?\b/g;
const weakenedSemanticHoverPattern =
  /\b(?:hover|group-hover):bg-accent\/\d{1,3}\b/g;
const arbitraryMetricPattern =
  /\b(?:w|h|min-w|max-w|min-h|max-h|size|p[trblxy]?|m[trblxy]?|gap|top|right|bottom|left|inset|text|leading|tracking|border|duration|delay)-\[([^\]]+)\]/g;
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

const intentionalRepeatedGeometry = new Set(["h-[1em]", "w-[2px]"]);

const brandColorAllowlist = new Map([
  [
    "src/components/ui/model-provider-icon.tsx",
    new Set(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]),
  ],
  [
    "src/components/auth/signin-form.tsx",
    new Set(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]),
  ],
  [
    "src/components/auth/signup-form.tsx",
    new Set(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]),
  ],
  ["src/components/onboarding/welcome-modal.tsx", new Set(["#0A66C2"])],
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const files = await walk(srcRoot);
const violations = [];
const rawMetricLocations = new Map();
let brandColorExceptions = 0;

const dootCss = await readFile(join(srcRoot, "styles/doot.css"), "utf8");
const interactionStateBlocks = [
  [
    "light",
    dootCss.match(/:root,\s*:root\[data-theme\]\s*\{([\s\S]*?)\n\}/)?.[1],
  ],
  [
    "dark",
    dootCss.match(
      /:root\.dark,\s*:root\.dark\[data-theme\]\s*\{([\s\S]*?)\n\}/,
    )?.[1],
  ],
];

for (const [scheme, block] of interactionStateBlocks) {
  if (!block) {
    violations.push(`src/styles/doot.css missing ${scheme} Doot token block`);
    continue;
  }

  const tokenValue = (name) =>
    block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
  const surface = tokenValue("doot-surface-raised");
  const hover = tokenValue("doot-hover");
  const selected = tokenValue("doot-selected");

  if (!surface || !hover || !selected) {
    violations.push(
      `src/styles/doot.css missing ${scheme} interaction-state token`,
    );
  } else {
    if (surface === hover) {
      violations.push(
        `${scheme} --doot-hover must differ from --doot-surface-raised so hover is visible`,
      );
    }
    if (hover === selected) {
      violations.push(
        `${scheme} --doot-selected must differ from --doot-hover so selected state remains distinct`,
      );
    }
  }
}

for (const file of files) {
  const text = await readFile(file, "utf8");
  const displayPath = relative(root, file);
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const match of line.matchAll(paletteUtilityPattern)) {
      violations.push(
        `${displayPath}:${lineNumber} direct palette utility: ${match[0]}`,
      );
    }

    for (const match of line.matchAll(weakenedSemanticHoverPattern)) {
      violations.push(
        `${displayPath}:${lineNumber} weakens semantic hover token: ${match[0]}`,
      );
    }

    for (const match of line.matchAll(hexPattern)) {
      const allowed = brandColorAllowlist.get(displayPath)?.has(match[0]);
      if (allowed) {
        brandColorExceptions += 1;
      } else if ([".js", ".jsx", ".ts", ".tsx"].includes(extname(file))) {
        violations.push(
          `${displayPath}:${lineNumber} raw UI color: ${match[0]}`,
        );
      }
    }

    if (
      [".js", ".jsx", ".ts", ".tsx"].includes(extname(file)) &&
      /\b(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/.test(line) &&
      !line.includes("var(")
    ) {
      violations.push(
        `${displayPath}:${lineNumber} raw functional UI color: ${line.trim()}`,
      );
    }

    for (const match of line.matchAll(arbitraryMetricPattern)) {
      const value = match[1];
      if (
        !/\d/.test(value) ||
        value.includes("var(") ||
        value.startsWith("#") ||
        /^(?:rgb|rgba|hsl|hsla|oklch|lab|lch)\(/.test(value)
      ) {
        continue;
      }

      const utility = match[0];
      const locations = rawMetricLocations.get(utility) ?? [];
      locations.push(`${displayPath}:${lineNumber}`);
      rawMetricLocations.set(utility, locations);
    }
  });
}

for (const [utility, locations] of rawMetricLocations) {
  if (locations.length > 1 && !intentionalRepeatedGeometry.has(utility)) {
    violations.push(
      `repeated arbitrary metric ${utility} at ${locations.join(", ")}`,
    );
  }
}

if (violations.length > 0) {
  console.error("Design token check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Design token check passed.");
}

console.log(
  JSON.stringify(
    {
      brandColorExceptions,
      rawArbitraryMetricOccurrences: [...rawMetricLocations.values()].reduce(
        (total, locations) => total + locations.length,
        0,
      ),
      repeatedIntentionalGeometry: [...intentionalRepeatedGeometry],
    },
    null,
    2,
  ),
);
