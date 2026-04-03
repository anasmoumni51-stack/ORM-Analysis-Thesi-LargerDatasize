const fs = require('fs');
const path = require('path');

const resultsDir = path.join(__dirname, '..', 'results');
const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('results-') && f.endsWith('.json'));

if (files.length === 0) {
  console.log('No results found. Run benchmark first.');
  process.exit(0);
}

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
  const size = file.replace('results-', '').replace('.json', '');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Dataset Size: ${size}`);
  console.log(`${'='.repeat(60)}`);

  const opCodes = ['C1', 'C2', 'C3', 'R1', 'R2', 'R3', 'U1', 'U2', 'D1', 'D2', 'J1', 'M1', 'M2'];
  const fws = ['rawsql', 'prisma', 'typeorm', 'sequelize', 'drizzle'];

  // Per-operation comparison table
  console.log('\nExecution Time (ms) — Mean (CV%)\n');
  const header = 'Operation'.padEnd(28) + fws.map(f => f.padStart(14)).join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const opId of opCodes) {
    const row = (opCodes.find(c => c === opId) || opId).padEnd(28);
    const cells = fws.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry) return ''.padStart(14);
      const cv = entry.stats.cv.toFixed(1);
      return `${entry.stats.mean.toFixed(3)}(${cv}%)`.padStart(14);
    });
    console.log(row + cells.join(''));
  }

  // Overhead table
  console.log(`\nOverhead % vs Raw SQL\n`);
  for (const fw of fws) {
    if (fw === 'rawsql') continue;
    const overhead = data[fw]?.overhead;
    if (!overhead) continue;
    console.log(`${fw}:`);
    for (const opId of opCodes) {
      if (overhead[opId] !== undefined) {
        console.log(`  ${opId}: ${overhead[opId].toFixed(2)}%`);
      }
    }
  }

  // Stability report
  console.log('\nStability Report (CV% < 15% = stable)\n');
  for (const fw of fws) {
    for (const opId of opCodes) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const stable = entry.stats.cv < 15 ? 'OK' : 'UNSTABLE';
      console.log(`  ${fw} ${opId}: CV=${entry.stats.cv.toFixed(2)}% [${stable}]`);
    }
  }
}
