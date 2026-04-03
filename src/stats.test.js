const { computeStats, computeOverhead } = require('./stats');

describe('computeStats', () => {
  describe('empty input', () => {
    test('returns null for empty array', () => {
      const result = computeStats([]);
      expect(result).toBeNull();
    });
  });

  describe('single value', () => {
    test('returns correct stats for single value', () => {
      const result = computeStats([10]);
      expect(result).toEqual({
        mean: 10,
        min: 10,
        max: 10,
        stddev: 0,
        cv: 0,
        count: 1,
      });
    });
  });

  describe('multiple values', () => {
    test('returns correct mean', () => {
      const result = computeStats([10, 20, 30]);
      expect(result.mean).toBeCloseTo(20, 5);
    });

    test('returns correct min', () => {
      const result = computeStats([10, 20, 30]);
      expect(result.min).toBe(10);
    });

    test('returns correct max', () => {
      const result = computeStats([10, 20, 30]);
      expect(result.max).toBe(30);
    });

    test('returns correct stddev', () => {
      const result = computeStats([10, 20, 30]);
      // variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / 3 = (100 + 0 + 100) / 3 = 66.67
      // stddev = sqrt(66.67) = 8.165
      expect(result.stddev).toBeCloseTo(8.165, 2);
    });

    test('returns correct CV percentage', () => {
      const result = computeStats([10, 20, 30]);
      // CV = (stddev / mean) * 100 = (8.165 / 20) * 100 = 40.82%
      expect(result.cv).toBeCloseTo(40.82, 1);
    });

    test('returns correct count', () => {
      const result = computeStats([10, 20, 30, 40, 50]);
      expect(result.count).toBe(5);
    });
  });

  describe('stability classification', () => {
    test('identifies stable results (CV < 15%)', () => {
      const result = computeStats([100, 101, 99, 100, 100]);
      expect(result.cv).toBeLessThan(15);
    });

    test('identifies unstable results (CV >= 15%)', () => {
      const result = computeStats([10, 50, 90, 30, 70]);
      expect(result.cv).toBeGreaterThan(15);
    });
  });

  describe('edge cases', () => {
    test('handles zeros correctly', () => {
      const result = computeStats([0, 0, 0]);
      expect(result.mean).toBe(0);
      expect(result.cv).toBe(0);
    });

    test('handles negative values correctly', () => {
      const result = computeStats([-10, 0, 10]);
      expect(result.mean).toBe(0);
    });

    test('handles large numbers correctly', () => {
      const result = computeStats([1000000, 1000001, 999999]);
      expect(result.mean).toBe(1000000);
      expect(result.cv).toBeLessThan(1);
    });
  });
});

describe('computeOverhead', () => {
  describe('basic overhead calculation', () => {
    test('calculates 0% overhead when equal', () => {
      const result = computeOverhead(100, 100);
      expect(result).toBe(0);
    });

    test('calculates positive overhead when ORM is slower', () => {
      const result = computeOverhead(150, 100);
      expect(result).toBe(50);
    });

    test('calculates negative overhead when ORM is faster', () => {
      const result = computeOverhead(80, 100);
      expect(result).toBe(-20);
    });

    test('calculates 100% overhead when ORM is 2x slower', () => {
      const result = computeOverhead(200, 100);
      expect(result).toBe(100);
    });

    test('calculates 200% overhead when ORM is 3x slower', () => {
      const result = computeOverhead(300, 100);
      expect(result).toBe(200);
    });
  });

  describe('edge cases', () => {
    test('returns Infinity when raw is 0', () => {
      const result = computeOverhead(100, 0);
      expect(result).toBe(Infinity);
    });

    test('handles decimal values correctly', () => {
      const result = computeOverhead(12.345, 10.0);
      expect(result).toBeCloseTo(23.45, 1);
    });
  });
});
