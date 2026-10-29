import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import ts from "typescript";

const root = process.cwd();
const srcRoot = join(root, "src");
const sourceExtensions = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const allowedArbitraryRadius = new Set(["inherit", "1px", "2px"]);
const allowedCssRadius = new Set([
  "0",
  "inherit",
  "50% 50% 50% var(--doot-radius-control)",
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
const counts = {
  semanticDataRadius: 0,
  legacyDataRadius: 0,
  roundedFull: 0,
};

const semanticRadiusNames = new Set([
  "inline",
  "control",
  "surface",
  "overlay",
  "message",
  "composer",
  "round",
]);
const legacyRadiusNames = new Set([
  "small-radius",
  "radius",
  "radius3",
  "composer-radius",
]);

const requiredRadiusBySlot = new Map([
  ["alert", "surface"],
  ["button", "control"],
  ["card", "surface"],
  ["dialog-content", "overlay"],
  ["alert-dialog-content", "overlay"],
  ["popover-content", "overlay"],
  ["hover-card-content", "overlay"],
  ["tooltip-content", "control"],
  ["input", "control"],
  ["textarea", "control"],
  ["select-trigger", "control"],
  ["select-content", "overlay"],
  ["select-item", "control"],
  ["dropdown-menu-content", "overlay"],
  ["dropdown-menu-item", "control"],
  ["dropdown-menu-checkbox-item", "control"],
  ["dropdown-menu-radio-item", "control"],
  ["dropdown-menu-sub-trigger", "control"],
  ["dropdown-menu-sub-content", "overlay"],
  ["command", "surface"],
  ["command-input", "control"],
  ["command-item", "control"],
  ["tabs-list", "surface"],
  ["tabs-trigger", "control"],
  ["skeleton", "surface"],
]);

function getStringAttribute(node, sourceFile, name) {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText(sourceFile) !== name) {
      continue;
    }
    if (attribute.initializer && ts.isStringLiteral(attribute.initializer)) {
      return attribute.initializer.text;
    }
  }
  return null;
}

for (const file of files) {
  const text = await readFile(file, "utf8");
  const displayPath = relative(root, file);
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    for (const match of line.matchAll(/border-radius\s*:\s*([^;]+);/g)) {
      const value = match[1].trim().replace(/\s*!important$/, "");
      if (!value.startsWith("var(") && !allowedCssRadius.has(value)) {
        violations.push(
          `${displayPath}:${lineNumber} hardcoded border-radius: ${value}`,
        );
      }
    }

    for (const match of line.matchAll(
      /borderRadius\s*:\s*["'`]([^"'`]+)["'`]/g,
    )) {
      const value = match[1].trim();
      if (!value.startsWith("var(") && !allowedCssRadius.has(value)) {
        violations.push(
          `${displayPath}:${lineNumber} hardcoded borderRadius: ${value}`,
        );
      }
    }

    for (const match of line.matchAll(/rounded-\[([^\]]+)\]/g)) {
      const value = match[1].trim();
      if (!allowedArbitraryRadius.has(value)) {
        violations.push(
          `${displayPath}:${lineNumber} arbitrary radius utility: rounded-[${value}]`,
        );
      }
    }

    counts.roundedFull += [...line.matchAll(/\brounded-full\b/g)].length;

    for (const match of line.matchAll(/data-radius=["']([^"']+)["']/g)) {
      if (semanticRadiusNames.has(match[1])) counts.semanticDataRadius += 1;
      if (legacyRadiusNames.has(match[1])) counts.legacyDataRadius += 1;
    }
  });

  if ([".tsx", ".jsx"].includes(extname(file))) {
    const sourceFile = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const slot = getStringAttribute(node, sourceFile, "data-slot");
        const expectedRadius = slot ? requiredRadiusBySlot.get(slot) : null;
        if (expectedRadius) {
          const radius = getStringAttribute(node, sourceFile, "data-radius");
          if (radius !== expectedRadius) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            violations.push(
              `${displayPath}:${line + 1} data-slot="${slot}" must own data-radius="${expectedRadius}"`,
            );
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }
}

const themeText = await readFile(join(srcRoot, "styles/theme.css"), "utf8");
const requiredThemeRadiusBridge = [
  "--radius: var(--radius-inline);",
  "--radius-xs: var(--radius-inline);",
  "--radius-sm: var(--radius-inline);",
  "--radius-md: var(--radius-control);",
  "--radius-lg: var(--radius-surface);",
  "--radius-xl: var(--radius-overlay);",
  "--radius-2xl: var(--radius-overlay);",
  "--radius-3xl: var(--radius-overlay);",
  "--radius-full: var(--radius-round);",
];

for (const bridge of requiredThemeRadiusBridge) {
  if (!themeText.includes(bridge)) {
    violations.push(`src/styles/theme.css missing radius bridge: ${bridge}`);
  }
}

if (violations.length > 0) {
  console.error("Radius token check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log("Radius token check passed.");
}

console.log(
  JSON.stringify(
    {
      semanticDataRadius: counts.semanticDataRadius,
      legacyDataRadius: counts.legacyDataRadius,
      intentionalRoundedFull: counts.roundedFull,
    },
    null,
    2,
  ),
);
