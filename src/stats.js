function computeStats(timings) {
  const n = timings.length;
  if (n === 0) return null;

  const mean = timings.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const variance = timings.reduce((sum, t) => sum + (t - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? (stddev / mean) * 100 : 0;

  return { mean, min, max, stddev, cv, count: n };
}

function computeOverhead(ormMean, rawMean) {
  if (rawMean === 0) return Infinity;
  return ((ormMean - rawMean) / rawMean) * 100;
}

module.exports = { computeStats, computeOverhead };
