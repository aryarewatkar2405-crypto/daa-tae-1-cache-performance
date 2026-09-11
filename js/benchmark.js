/**
 * Cache Lab - Benchmark Engine
 * Handles warm-up, precise performance.now() microbenchmark timings,
 * multi-trial statistics, scaling sweeps, and CSV export.
 */

class BenchmarkEngine {
  /**
   * Determine target key based on mode.
   */
  static getTargetKey(sortedKeys, mode) {
    const count = sortedKeys.length;
    switch (mode) {
      case 'first':
        return sortedKeys[0];
      case 'middle':
        return sortedKeys[Math.floor(count / 2)];
      case 'last':
        return sortedKeys[count - 1];
      case 'missing':
        // Odd number is missing since keys are even (i * 2)
        return sortedKeys[Math.floor(count / 2)] + 1;
      case 'random':
      default:
        return sortedKeys[Math.floor(Math.random() * count)];
    }
  }

  /**
   * Classify working set relative to estimated L1/L2 cache capacities.
   */
  static classifyRegion(workingSetKB, l1KB, l2KB) {
    if (workingSetKB <= l1KB) {
      return { id: 'l1', label: 'L1 RESIDENT', class: 'badge-l1' };
    } else if (workingSetKB <= l2KB) {
      return { id: 'l2', label: 'L2 PRESSURE', class: 'badge-l2' };
    } else {
      return { id: 'ram', label: 'BEYOND L2 (MAIN MEMORY)', class: 'badge-ram' };
    }
  }

  /**
   * Run a single benchmark trial for a given algorithm.
   * Uses repetition batching for micro-operations to ensure high precision.
   */
  static runAlgorithmTrial(algorithm, dataset, targetKey, accessPattern) {
    const { intView, intStride, count, irregularIndices, bstRoot } = dataset;
    
    // Choose batch count depending on dataset size to get measurable milliseconds
    // For very large datasets, 1-5 reps; for small datasets, 50-200 reps.
    let reps = 1;
    if (algorithm === 'linear') {
      reps = count < 5000 ? 50 : count < 20000 ? 10 : 1;
    } else {
      // Logarithmic searches are extremely fast, batch to achieve accurate timing
      reps = count < 20000 ? 200 : 50;
    }

    // Warm-up pass (un-timed)
    if (algorithm === 'linear') {
      SearchAlgorithms.linearSearch(intView, intStride, count, targetKey, accessPattern, irregularIndices);
    } else if (algorithm === 'binary-arr') {
      SearchAlgorithms.binarySearchArray(intView, intStride, count, targetKey);
    } else if (algorithm === 'bst') {
      SearchAlgorithms.bstSearch(bstRoot, targetKey);
    }

    // Timed pass
    let resultOps;
    const start = performance.now();
    for (let r = 0; r < reps; r++) {
      if (algorithm === 'linear') {
        resultOps = SearchAlgorithms.linearSearch(intView, intStride, count, targetKey, accessPattern, irregularIndices);
      } else if (algorithm === 'binary-arr') {
        resultOps = SearchAlgorithms.binarySearchArray(intView, intStride, count, targetKey);
      } else if (algorithm === 'bst') {
        resultOps = SearchAlgorithms.bstSearch(bstRoot, targetKey);
      }
    }
    const end = performance.now();
    const totalElapsedMs = end - start;
    const timePerSearchMs = totalElapsedMs / reps;

    return {
      timeMs: timePerSearchMs,
      comparisons: resultOps.comparisons,
      accesses: resultOps.accesses,
      found: resultOps.found
    };
  }

  /**
   * Execute complete benchmark across multiple trials for all selected structures.
   */
  static async runBenchmarkSuite(config, onProgress) {
    const {
      recordCount,
      recordSize,
      l1KB,
      l2KB,
      trials,
      targetMode,
      accessPattern,
      structures // ['linear', 'binary-arr', 'bst']
    } = config;

    const workingSetBytes = recordCount * recordSize;
    const workingSetKB = workingSetBytes / 1024;
    const region = this.classifyRegion(workingSetKB, l1KB, l2KB);

    if (onProgress) onProgress({ step: 'Generating Dataset in Memory...', percent: 15 });
    await new Promise(r => setTimeout(r, 20));

    const dataset = DatasetGenerator.generate(recordCount, recordSize);
    const targetKey = this.getTargetKey(dataset.sortedKeys, targetMode);

    const results = [];
    const totalSteps = structures.length * trials;
    let stepCount = 0;

    for (const structId of structures) {
      let structName = 'Linear Array Search';
      let structComplexity = 'O(n)';
      if (structId === 'binary-arr') {
        structName = 'Binary Search (Array)';
        structComplexity = 'O(log n)';
      } else if (structId === 'bst') {
        structName = 'Binary Search Tree';
        structComplexity = 'O(log n)';
      }

      const trialTimes = [];
      let lastResultOps = null;

      for (let t = 0; t < trials; t++) {
        stepCount++;
        const pct = Math.round(15 + (stepCount / totalSteps) * 80);
        if (onProgress) {
          onProgress({
            step: `Testing ${structName} (Trial ${t + 1}/${trials})...`,
            percent: pct
          });
        }
        await new Promise(r => setTimeout(r, 10));

        const trialRes = this.runAlgorithmTrial(structId, dataset, targetKey, accessPattern);
        trialTimes.push(trialRes.timeMs);
        lastResultOps = trialRes;
      }

      // Compute statistics
      const sum = trialTimes.reduce((acc, v) => acc + v, 0);
      const avgTimeMs = sum / trialTimes.length;
      const minTimeMs = Math.min(...trialTimes);

      results.push({
        id: structId,
        name: structName,
        complexity: structComplexity,
        recordCount,
        recordSize,
        workingSetBytes,
        workingSetKB,
        region,
        trials: trialTimes,
        avgTimeMs,
        minTimeMs,
        comparisons: lastResultOps ? lastResultOps.comparisons : 0,
        accesses: lastResultOps ? lastResultOps.accesses : 0,
        found: lastResultOps ? lastResultOps.found : false,
        timestamp: new Date().toISOString()
      });
    }

    if (onProgress) onProgress({ step: 'Benchmark Complete', percent: 100 });
    return results;
  }

  /**
   * Run scaling experiment across multiple dataset sizes.
   */
  static async runScalingExperiment(config, datasetSizes, onProgress) {
    const allResults = [];
    const totalSizes = datasetSizes.length;

    for (let i = 0; i < totalSizes; i++) {
      const size = datasetSizes[i];
      const stepConfig = { ...config, recordCount: size, trials: Math.min(config.trials, 3) };
      
      if (onProgress) {
        onProgress({
          step: `Scaling Step ${i + 1}/${totalSizes}: ${size.toLocaleString()} records...`,
          percent: Math.round(((i) / totalSizes) * 100)
        });
      }

      const sizeResults = await this.runBenchmarkSuite(stepConfig, null);
      allResults.push({
        size,
        results: sizeResults
      });
    }

    if (onProgress) onProgress({ step: 'Scaling Sweep Complete', percent: 100 });
    return allResults;
  }

  /**
   * Generate CSV format string from benchmark results.
   */
  static generateCSV(resultsHistory) {
    const headers = [
      'timestamp',
      'structure',
      'record_count',
      'record_size_bytes',
      'working_set_bytes',
      'working_set_kb',
      'estimated_l1_kb',
      'estimated_l2_kb',
      'region',
      'avg_execution_time_ms',
      'min_execution_time_ms',
      'comparisons',
      'accesses',
      'found'
    ];

    const rows = [headers.join(',')];

    for (const r of resultsHistory) {
      const row = [
        r.timestamp || new Date().toISOString(),
        `"${r.name}"`,
        r.recordCount,
        r.recordSize,
        r.workingSetBytes,
        r.workingSetKB.toFixed(2),
        r.l1KB || 32,
        r.l2KB || 256,
        `"${r.region.label}"`,
        r.avgTimeMs.toFixed(5),
        r.minTimeMs.toFixed(5),
        r.comparisons,
        r.accesses,
        r.found
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Triggers client-side browser file download for CSV blob.
   */
  static downloadCSV(csvContent, filename = 'cache_lab_benchmark_results.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.BenchmarkEngine = BenchmarkEngine;
}
