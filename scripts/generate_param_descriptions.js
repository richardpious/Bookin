const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '../docs/09_config_parameters/README.md');
const outputPath = path.join(__dirname, '../platform/frontend/bookin/src/data/paramDescriptions.json');

const readmeContent = fs.readFileSync(readmePath, 'utf8');

const tableRegex = /\| `([^`]+)` \| [^|]+ \| [^|]+ \| ([^|]+) \|/g;
const descriptions = {};

let match;
while ((match = tableRegex.exec(readmeContent)) !== null) {
  const param = match[1].trim();
  const desc = match[2].trim();
  descriptions[param] = desc;
}

if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(descriptions, null, 2));
console.log('Successfully generated paramDescriptions.json');
