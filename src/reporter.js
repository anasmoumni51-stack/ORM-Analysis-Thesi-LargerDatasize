const fs = require('fs');
const path = require('path');

const resultsDir = path.join(__dirname, '..', 'results');
const files = fs.readdirSync(resultsDir).filter(f => f.startsWith('results-') && f.endsWith('.json'));

if (files.length === 0) {
  console.log('No results found. Run benchmark first.');
  process.exit(0);
}

// Capture all output for file export
let output = '';
function log(line = '') {
  console.log(line);
  output += line + '\n';
}

const OP_NAMES = {
  C1: 'Create User',
  C3: 'Bulk Insert Posts',
  R1: 'Get User By ID',
  R3: 'Get Paginated Posts',
  U1: 'Update User',
  D1: 'Delete User',
  J1: 'Get Post With Author',
  M1: 'Create Post With 3 Categories',
};

const OP_CODES = ['C1', 'C3', 'R1', 'R3', 'U1', 'D1', 'J1', 'M1'];
const FWS = ['rawsql', 'prisma', 'typeorm', 'sequelize', 'drizzle'];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
  const size = file.replace('results-', '').replace('.json', '');

  log(`\n${'='.repeat(80)}`);
  log(`Dataset Size: ${size}`);
  log(`${'='.repeat(80)}`);

  // ── Table 1: Execution Time — Mean (CV%) ──
  log('\n┌─ Execution Time (ms) — Mean (CV%)');
  log('');
  const timeHeader = 'Operation'.padEnd(32) + FWS.map(f => f.padStart(16)).join('');
  log(timeHeader);
  log('-'.repeat(timeHeader.length));

  for (const opId of OP_CODES) {
    const label = `${opId}: ${OP_NAMES[opId] || ''}`.padEnd(32);
    const cells = FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry) return ''.padStart(16);
      const cv = entry.stats.cv.toFixed(1);
      return `${entry.stats.mean.toFixed(3)} (${cv}%)`.padStart(16);
    });
    log(label + cells.join(''));
  }

  // ── Table 2: Detailed Execution Time Stats ──
  log('\n┌─ Detailed Execution Time Stats (ms)');
  log('');
  for (const opId of OP_CODES) {
    log(`\n  ${opId}: ${OP_NAMES[opId]}`);
    const detailHeader = 'Framework'.padEnd(14) + 'Mean'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10) + 'StdDev'.padStart(10) + 'CV%'.padStart(10);
    log(detailHeader);
    log('  ' + '-'.repeat(detailHeader.length - 2));

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
      log('  ' + row);
    }
  }

  // ── Table 3: Memory Consumption — Mean (CV%) ──
  log('\n┌─ Memory Consumption (MB) — Mean (CV%)');
  log('');
  const memHeader = 'Operation'.padEnd(32) + FWS.map(f => f.padStart(16)).join('');
  log(memHeader);
  log('-'.repeat(memHeader.length));

  for (const opId of OP_CODES) {
    const label = `${opId}: ${OP_NAMES[opId] || ''}`.padEnd(32);
    const cells = FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry || !entry.memoryStats) return ''.padStart(16);
      const cv = entry.memoryStats.cv.toFixed(1);
      return `${entry.memoryStats.mean.toFixed(2)} (${cv}%)`.padStart(16);
    });
    log(label + cells.join(''));
  }

  // ── Table 4: Detailed Memory Stats ──
  log('\n┌─ Detailed Memory Stats (MB)');
  log('');
  for (const opId of OP_CODES) {
    log(`\n  ${opId}: ${OP_NAMES[opId]}`);
    const memDetailHeader = 'Framework'.padEnd(14) + 'Mean'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10) + 'StdDev'.padStart(10) + 'CV%'.padStart(10);
    log(memDetailHeader);
    log('  ' + '-'.repeat(memDetailHeader.length - 2));

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
      log('  ' + row);
    }
  }

  // ── Overhead % vs Raw SQL ──
  log('\n┌─ Overhead % vs Raw SQL (based on mean execution time)');
  log('');
  for (const fw of FWS) {
    if (fw === 'rawsql') continue;
    const overhead = data[fw]?.overhead;
    if (!overhead) continue;
    log(`  ${fw}:`);
    for (const opId of OP_CODES) {
      if (overhead[opId] !== undefined) {
        const label = `${opId} (${OP_NAMES[opId]})`.padEnd(38);
        log(`    ${label} ${overhead[opId].toFixed(2)}%`);
      }
    }
  }

  // ── Stability Report ──
  log('\n┌─ Stability Report (CV% < 15% = stable)');
  log('');
  for (const fw of FWS) {
    let fwUnstable = 0;
    for (const opId of OP_CODES) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const stable = entry.stats.cv < 15 ? 'OK' : 'UNSTABLE';
      if (stable === 'UNSTABLE') fwUnstable++;
    }
    const status = fwUnstable === 0 ? 'ALL STABLE' : `${fwUnstable} unstable`;
    log(`  ${fw}: ${status}`);
    for (const opId of OP_CODES) {
      const entry = data[fw]?.[opId];
      if (!entry) continue;
      const stable = entry.stats.cv < 15 ? 'OK' : 'UNSTABLE';
      log(`    ${`${opId} (${OP_NAMES[opId]})`.padEnd(38)} CV=${entry.stats.cv.toFixed(2)}% [${stable}]`);
    }
  }
}

// ── Summary across all dataset sizes ──
log(`\n${'='.repeat(80)}`);
log('CROSS-SIZE SUMMARY — Mean Execution Time (ms)');
log(`${'='.repeat(80)}`);

for (const opId of OP_CODES) {
  log(`\n  ${opId}: ${OP_NAMES[opId]}`);
  const sumHeader = 'Size'.padEnd(10) + FWS.map(f => f.padStart(16)).join('');
  log(sumHeader);
  log('  ' + '-'.repeat(sumHeader.length - 2));

  for (const file of files) {
    const size = file.replace('results-', '').replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
    const row = size.padEnd(10) + FWS.map(fw => {
      const entry = data[fw]?.[opId];
      if (!entry) return ''.padStart(16);
      return entry.stats.mean.toFixed(3).padStart(16);
    }).join('');
    log('  ' + row);
  }
}

log(`\n${'='.repeat(80)}`);
log('CROSS-SIZE SUMMARY — Overhead % vs Raw SQL');
log(`${'='.repeat(80)}`);

for (const fw of FWS) {
  if (fw === 'rawsql') continue;
  log(`\n  ${fw}:`);
  const overheadHeader = 'Size'.padEnd(10) + OP_CODES.map(op => op.padStart(8)).join('');
  log(overheadHeader);
  log('  ' + '-'.repeat(overheadHeader.length - 2));

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
    log('  ' + row);
  }
}

log('\nAll results reported.');

// ── Write output to file ──
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(resultsDir, `report-${timestamp}.txt`);
fs.writeFileSync(outFile, output);
console.log(`\nResults exported to: ${outFile}`);
