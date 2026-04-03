const fs = require('fs');
const path = require('path');

const resultsDir = path.join(__dirname, '..', 'results');
const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('results-') && f.endsWith('.json'));

if (files.length === 0) {
  console.log('No results found. Run benchmark first.');
  process.exit(0);
}

const OP_NAMES = {
  C1: 'Create User',
  C2: 'Create Post',
  C3: 'Bulk Insert Posts (10)',
  R1: 'Get User By ID',
  R2: 'Get Post By ID',
  R3: 'Get Paginated Posts',
  U1: 'Update User',
  U2: 'Update Post',
  D1: 'Delete User',
  D2: 'Bulk Delete Posts by Author',
  J1: 'Get Post With Author',
  M1: 'Create Post With Categories',
  M2: 'Get Post With Categories',
};

const OP_CODES = ['C1', 'C2', 'C3', 'R1', 'R2', 'R3', 'U1', 'U2', 'D1', 'D2', 'J1', 'M1', 'M2'];
const FWS = ['rawsql', 'prisma', 'typeorm', 'sequelize', 'drizzle'];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
  const size = file.replace('results-', '').replace('.json', '');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Dataset Size: ${size}`);
  console.log(`${'='.repeat(80)}`);

  // ── Table 1: Execution Time — Mean (CV%) ──
  console.log('\n┌─ Execution Time (ms) — Mean (CV%)');
  console.log('');
  const timeHeader = 'Operation'.padEnd(32) + FWS.map(f => f.padStart(16)).join('');
  console.log(timeHeader);
  console.log('-'.repeat(timeHeader.length));

  for (const opId of OP_CODES) {
    const label = `${opId}: ${OP_NAMES[opId] || ''}`.padEnd(32);
    const cells = FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry) return ''.padStart(16);
      const cv = entry.stats.cv.toFixed(1);
      return `${entry.stats.mean.toFixed(3)} (${cv}%)`.padStart(16);
    });
    console.log(label + cells.join(''));
  }

  // ── Table 2: Detailed Execution Time Stats ──
  console.log('\n┌─ Detailed Execution Time Stats (ms)');
  console.log('');
  for (const opId of OP_CODES) {
    console.log(`\n  ${opId}: ${OP_NAMES[opId]}`);
    const detailHeader = 'Framework'.padEnd(14) + 'Mean'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10) + 'StdDev'.padStart(10) + 'CV%'.padStart(10);
    console.log(detailHeader);
    console.log('  ' + '-'.repeat(detailHeader.length - 2));

    for (const fw of FWS) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const s = entry.stats;
      const row = fw.padEnd(14) +
        s.mean.toFixed(3).padStart(10) +
        s.min.toFixed(3).padStart(10) +
        s.max.toFixed(3).padStart(10) +
        s.stddev.toFixed(3).padStart(10) +
        s.cv.toFixed(2).padStart(10);
      console.log('  ' + row);
    }
  }

  // ── Table 3: Memory Consumption — Mean (CV%) ──
  console.log('\n┌─ Memory Consumption (MB) — Mean (CV%)');
  console.log('');
  const memHeader = 'Operation'.padEnd(32) + FWS.map(f => f.padStart(16)).join('');
  console.log(memHeader);
  console.log('-'.repeat(memHeader.length));

  for (const opId of OP_CODES) {
    const label = `${opId}: ${OP_NAMES[opId] || ''}`.padEnd(32);
    const cells = FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry || !entry.memoryStats) return ''.padStart(16);
      const cv = entry.memoryStats.cv.toFixed(1);
      return `${entry.memoryStats.mean.toFixed(2)} (${cv}%)`.padStart(16);
    });
    console.log(label + cells.join(''));
  }

  // ── Table 4: Detailed Memory Stats ──
  console.log('\n┌─ Detailed Memory Stats (MB)');
  console.log('');
  for (const opId of OP_CODES) {
    console.log(`\n  ${opId}: ${OP_NAMES[opId]}`);
    const memDetailHeader = 'Framework'.padEnd(14) + 'Mean'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10) + 'StdDev'.padStart(10) + 'CV%'.padStart(10);
    console.log(memDetailHeader);
    console.log('  ' + '-'.repeat(memDetailHeader.length - 2));

    for (const fw of FWS) {
      const entry = data[fw]?.[opId];
      if (!entry || !entry.memoryStats) continue;
      const m = entry.memoryStats;
      const row = fw.padEnd(14) +
        m.mean.toFixed(3).padStart(10) +
        m.min.toFixed(3).padStart(10) +
        m.max.toFixed(3).padStart(10) +
        m.stddev.toFixed(3).padStart(10) +
        m.cv.toFixed(2).padStart(10);
      console.log('  ' + row);
    }
  }

  // ── Overhead % vs Raw SQL ──
  console.log('\n┌─ Overhead % vs Raw SQL (based on mean execution time)');
  console.log('');
  for (const fw of FWS) {
    if (fw === 'rawsql') continue;
    const overhead = data[fw]?.overhead;
    if (!overhead) continue;
    console.log(`  ${fw}:`);
    for (const opId of OP_CODES) {
      if (overhead[opId] !== undefined) {
        const label = `${opId} (${OP_NAMES[opId]})`.padEnd(38);
        console.log(`    ${label} ${overhead[opId].toFixed(2)}%`);
      }
    }
  }

  // ── Stability Report ──
  console.log('\n┌─ Stability Report (CV% < 15% = stable)');
  console.log('');
  for (const fw of FWS) {
    let fwUnstable = 0;
    for (const opId of OP_CODES) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const stable = entry.stats.cv < 15 ? 'OK' : 'UNSTABLE';
      if (stable === 'UNSTABLE') fwUnstable++;
    }
    const status = fwUnstable === 0 ? 'ALL STABLE' : `${fwUnstable} unstable`;
    console.log(`  ${fw}: ${status}`);
    for (const opId of OP_CODES) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const stable = entry.stats.cv < 15 ? 'OK' : 'UNSTABLE';
      console.log(`    ${`${opId} (${OP_NAMES[opId]})`.padEnd(38)} CV=${entry.stats.cv.toFixed(2)}% [${stable}]`);
    }
  }
}

// ── Summary across all dataset sizes ──
console.log(`\n${'='.repeat(80)}`);
console.log('CROSS-SIZE SUMMARY — Mean Execution Time (ms)');
console.log(`${'='.repeat(80)}`);

for (const opId of OP_CODES) {
  console.log(`\n  ${opId}: ${OP_NAMES[opId]}`);
  const sumHeader = 'Size'.padEnd(10) + FWS.map(f => f.padStart(16)).join('');
  console.log(sumHeader);
  console.log('  ' + '-'.repeat(sumHeader.length - 2));

  for (const file of files) {
    const size = file.replace('results-', '').replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
    const row = size.padEnd(10) + FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry) return ''.padStart(16);
      return entry.stats.mean.toFixed(3).padStart(16);
    }).join('');
    console.log('  ' + row);
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log('CROSS-SIZE SUMMARY — Overhead % vs Raw SQL');
console.log(`${'='.repeat(80)}`);

for (const fw of FWS) {
  if (fw === 'rawsql') continue;
  console.log(`\n  ${fw}:`);
  const overheadHeader = 'Size'.padEnd(10) + OP_CODES.map(op => op.padStart(8)).join('');
  console.log(overheadHeader);
  console.log('  ' + '-'.repeat(overheadHeader.length - 2));

  for (const file of files) {
    const size = file.replace('results-', '').replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
    const overhead = data[fw]?.overhead;
    if (!overhead) continue;
    const row = size.padEnd(10) + OP_CODES.map(opId => {
      const val = overhead[opId];
      if (val === undefined) return ''.padStart(8);
      return (val.toFixed(1) + '%').padStart(8);
    }).join('');
    console.log('  ' + row);
  }
}

console.log('\nAll results reported.');
