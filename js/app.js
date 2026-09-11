/**
 * Cache Lab - Main Application Controller
 * Handles UI interactions, validation, preset triggers, and state management.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    recordCount: 10000,
    recordSize: 64,
    l1KB: 32,
    l2KB: 256,
    trials: 3,
    targetMode: 'random',
    accessPattern: 'sequential',
    structures: ['linear', 'binary-arr', 'bst'],
    isRunning: false,
    latestResults: [],
    resultsHistory: [],
    timeSeriesData: [],
    workSeriesData: []
  };

  // DOM Elements
  const elRecordCountRange = document.getElementById('inputRecordCountRange');
  const elRecordCountNum = document.getElementById('inputRecordCountNum');
  const elRecordSize = document.getElementById('selectRecordSize');
  const elL1 = document.getElementById('inputL1Capacity');
  const elL2 = document.getElementById('inputL2Capacity');
  const elTrials = document.getElementById('inputTrials');
  const elTargetMode = document.getElementById('selectTargetMode');
  const elAccessPattern = document.getElementById('selectAccessPattern');

  const btnRunBenchmark = document.getElementById('btnRunBenchmark');
  const btnRunScaling = document.getElementById('btnRunScaling');
  const btnReset = document.getElementById('btnReset');
  const btnExportCSV = document.getElementById('btnExportCSV');

  const progressContainer = document.getElementById('benchmarkProgressArea');
  const progressText = document.getElementById('progressStatusText');
  const progressBar = document.getElementById('progressBarFill');

  // Checkboxes for algorithms
  const chkLinear = document.getElementById('chkLinear');
  const chkBinaryArr = document.getElementById('chkBinaryArr');
  const chkBst = document.getElementById('chkBst');

  // Presets
  const presetButtons = document.querySelectorAll('.btn-preset');

  // Initialize UI Values
  function syncUIFromState() {
    if (elRecordCountRange) elRecordCountRange.value = state.recordCount;
    if (elRecordCountNum) elRecordCountNum.value = state.recordCount;
    if (elRecordSize) elRecordSize.value = state.recordSize;
    if (elL1) elL1.value = state.l1KB;
    if (elL2) elL2.value = state.l2KB;
    if (elTrials) elTrials.value = state.trials;
    if (elTargetMode) elTargetMode.value = state.targetMode;
    if (elAccessPattern) elAccessPattern.value = state.accessPattern;

    if (chkLinear) chkLinear.checked = state.structures.includes('linear');
    if (chkBinaryArr) chkBinaryArr.checked = state.structures.includes('binary-arr');
    if (chkBst) chkBst.checked = state.structures.includes('bst');

    updateWorkingSetDisplay();
  }

  // Update working set display & capacity tracker
  function updateWorkingSetDisplay() {
    const workingSetBytes = state.recordCount * state.recordSize;
    const workingSetKB = workingSetBytes / 1024;
    VisualizationRenderer.updateMemoryHierarchyBar(workingSetKB, state.l1KB, state.l2KB);
  }

  // Input Event Listeners
  if (elRecordCountRange && elRecordCountNum) {
    elRecordCountRange.addEventListener('input', (e) => {
      state.recordCount = parseInt(e.target.value, 10);
      elRecordCountNum.value = state.recordCount;
      updateWorkingSetDisplay();
    });

    elRecordCountNum.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 100) val = 100;
      if (val > 200000) val = 200000;
      state.recordCount = val;
      elRecordCountNum.value = val;
      elRecordCountRange.value = Math.min(val, 100000);
      updateWorkingSetDisplay();
    });
  }

  if (elRecordSize) {
    elRecordSize.addEventListener('change', (e) => {
      state.recordSize = parseInt(e.target.value, 10);
      updateWorkingSetDisplay();
    });
  }

  if (elL1) {
    elL1.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= state.l2KB) {
        alert('Estimated L1 capacity must be smaller than L2 capacity.');
        elL1.value = state.l1KB;
        return;
      }
      state.l1KB = val;
      updateWorkingSetDisplay();
    });
  }

  if (elL2) {
    elL2.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val <= state.l1KB) {
        alert('Estimated L2 capacity must be larger than L1 capacity.');
        elL2.value = state.l2KB;
        return;
      }
      state.l2KB = val;
      updateWorkingSetDisplay();
    });
  }

  if (elTrials) {
    elTrials.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (val < 1) val = 1;
      if (val > 10) val = 10;
      state.trials = val;
      elTrials.value = val;
    });
  }

  if (elTargetMode) {
    elTargetMode.addEventListener('change', (e) => {
      state.targetMode = e.target.value;
    });
  }

  if (elAccessPattern) {
    elAccessPattern.addEventListener('change', (e) => {
      state.accessPattern = e.target.value;
    });
  }

  function updateSelectedStructures() {
    const list = [];
    if (chkLinear && chkLinear.checked) list.push('linear');
    if (chkBinaryArr && chkBinaryArr.checked) list.push('binary-arr');
    if (chkBst && chkBst.checked) list.push('bst');
    if (list.length === 0) {
      alert('At least one search structure must be selected.');
      if (chkLinear) chkLinear.checked = true;
      list.push('linear');
    }
    state.structures = list;
  }

  if (chkLinear) chkLinear.addEventListener('change', updateSelectedStructures);
  if (chkBinaryArr) chkBinaryArr.addEventListener('change', updateSelectedStructures);
  if (chkBst) chkBst.addEventListener('change', updateSelectedStructures);

  // Preset Handlers
  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = e.currentTarget.getAttribute('data-preset');
      switch (preset) {
        case 'l1':
          state.recordCount = 400;     // 400 * 64B = 25 KB <= 32 KB (L1)
          state.recordSize = 64;
          state.accessPattern = 'sequential';
          break;
        case 'l2':
          state.recordCount = 2500;    // 2500 * 64B = 160 KB (L1 < WS <= L2)
          state.recordSize = 64;
          state.accessPattern = 'sequential';
          break;
        case 'ram':
          state.recordCount = 15000;   // 15000 * 64B = 960 KB > 256 KB (Beyond L2)
          state.recordSize = 64;
          state.accessPattern = 'sequential';
          break;
        case 'stress':
          state.recordCount = 50000;   // 50000 * 64B = 3.2 MB (Heavy RAM Pressure)
          state.recordSize = 64;
          state.accessPattern = 'irregular';
          break;
      }
      syncUIFromState();
    });
  });

  // Set running state and disable/enable buttons
  function setRunning(running) {
    state.isRunning = running;
    if (btnRunBenchmark) btnRunBenchmark.disabled = running;
    if (btnRunScaling) btnRunScaling.disabled = running;
    if (btnReset) btnReset.disabled = running;
    if (progressContainer) {
      progressContainer.style.display = running ? 'block' : 'none';
    }
  }

  // Handle Single Benchmark
  if (btnRunBenchmark) {
    btnRunBenchmark.addEventListener('click', async () => {
      if (state.isRunning) return;
      updateSelectedStructures();

      setRunning(true);
      try {
        const results = await BenchmarkEngine.runBenchmarkSuite({
          recordCount: state.recordCount,
          recordSize: state.recordSize,
          l1KB: state.l1KB,
          l2KB: state.l2KB,
          trials: state.trials,
          targetMode: state.targetMode,
          accessPattern: state.accessPattern,
          structures: state.structures
        }, (p) => {
          if (progressText) progressText.textContent = p.step;
          if (progressBar) progressBar.style.width = `${p.percent}%`;
          const progressBarRole = document.getElementById('progressBarRole');
          if (progressBarRole) {
            progressBarRole.setAttribute('aria-valuenow', p.percent);
            progressBarRole.setAttribute('aria-valuetext', p.step);
          }
        });

        state.latestResults = results;
        results.forEach(r => {
          r.l1KB = state.l1KB;
          r.l2KB = state.l2KB;
          state.resultsHistory.push(r);
        });

        // Update Table and Interpretations
        VisualizationRenderer.renderResultsTable(results);
        VisualizationRenderer.renderInterpretation(results, state);

        // Update Charts
        updateChartsFromHistory();

        if (btnExportCSV) btnExportCSV.disabled = false;
      } catch (err) {
        console.error('Benchmark error:', err);
        alert('An error occurred during benchmark execution: ' + err.message);
      } finally {
        setRunning(false);
      }
    });
  }

  // Handle Multi-Size Scaling Experiment
  if (btnRunScaling) {
    btnRunScaling.addEventListener('click', async () => {
      if (state.isRunning) return;
      updateSelectedStructures();

      setRunning(true);
      const sweepSizes = [1000, 2500, 5000, 10000, 25000, 50000];

      try {
        const scalingData = await BenchmarkEngine.runScalingExperiment({
          recordSize: state.recordSize,
          l1KB: state.l1KB,
          l2KB: state.l2KB,
          trials: 3,
          targetMode: state.targetMode,
          accessPattern: state.accessPattern,
          structures: state.structures
        }, sweepSizes, (p) => {
          if (progressText) progressText.textContent = p.step;
          if (progressBar) progressBar.style.width = `${p.percent}%`;
          const progressBarRole = document.getElementById('progressBarRole');
          if (progressBarRole) {
            progressBarRole.setAttribute('aria-valuenow', p.percent);
            progressBarRole.setAttribute('aria-valuetext', p.step);
          }
        });

        // Extract last step results for the table
        const finalStepResults = scalingData[scalingData.length - 1].results;
        state.latestResults = finalStepResults;
        
        // Add all sweep results to history
        scalingData.forEach(s => {
          s.results.forEach(r => {
            r.l1KB = state.l1KB;
            r.l2KB = state.l2KB;
            state.resultsHistory.push(r);
          });
        });

        VisualizationRenderer.renderResultsTable(finalStepResults);
        VisualizationRenderer.renderInterpretation(finalStepResults, state);

        // Build series for charts
        buildScalingCharts(scalingData);

        if (btnExportCSV) btnExportCSV.disabled = false;
      } catch (err) {
        console.error('Scaling sweep error:', err);
        alert('An error occurred during scaling experiment: ' + err.message);
      } finally {
        setRunning(false);
      }
    });
  }

  // Build chart series from history / scaling
  function updateChartsFromHistory() {
    // Group history by structure
    const seriesMap = {
      'linear': { name: 'Linear Array Search', color: 'var(--color-linear)', data: [] },
      'binary-arr': { name: 'Binary Search (Array)', color: 'var(--color-binary-arr)', data: [] },
      'bst': { name: 'Binary Search Tree', color: 'var(--color-bst)', data: [] }
    };

    const workSeriesMap = {
      'linear': { name: 'Linear Array Search', color: 'var(--color-linear)', data: [] },
      'binary-arr': { name: 'Binary Search (Array)', color: 'var(--color-binary-arr)', data: [] },
      'bst': { name: 'Binary Search Tree', color: 'var(--color-bst)', data: [] }
    };

    state.resultsHistory.forEach(r => {
      if (seriesMap[r.id]) {
        seriesMap[r.id].data.push({ x: r.workingSetKB, y: r.avgTimeMs });
        workSeriesMap[r.id].data.push({ x: r.recordCount, y: r.comparisons });
      }
    });

    // Sort series by X
    const timeSeries = Object.values(seriesMap).filter(s => s.data.length > 0).map(s => {
      s.data.sort((a, b) => a.x - b.x);
      return s;
    });

    const workSeries = Object.values(workSeriesMap).filter(s => s.data.length > 0).map(s => {
      s.data.sort((a, b) => a.x - b.x);
      return s;
    });

    VisualizationRenderer.renderTimeChart('chartTimeSvg', timeSeries, state.l1KB, state.l2KB);
    VisualizationRenderer.renderWorkChart('chartWorkSvg', workSeries);
  }

  function buildScalingCharts(scalingData) {
    const seriesMap = {
      'linear': { name: 'Linear Array Search', color: 'var(--color-linear)', data: [] },
      'binary-arr': { name: 'Binary Search (Array)', color: 'var(--color-binary-arr)', data: [] },
      'bst': { name: 'Binary Search Tree', color: 'var(--color-bst)', data: [] }
    };

    const workSeriesMap = {
      'linear': { name: 'Linear Array Search', color: 'var(--color-linear)', data: [] },
      'binary-arr': { name: 'Binary Search (Array)', color: 'var(--color-binary-arr)', data: [] },
      'bst': { name: 'Binary Search Tree', color: 'var(--color-bst)', data: [] }
    };

    scalingData.forEach(s => {
      s.results.forEach(r => {
        if (seriesMap[r.id]) {
          seriesMap[r.id].data.push({ x: r.workingSetKB, y: r.avgTimeMs });
          workSeriesMap[r.id].data.push({ x: r.recordCount, y: r.comparisons });
        }
      });
    });

    const timeSeries = Object.values(seriesMap).filter(s => s.data.length > 0);
    const workSeries = Object.values(workSeriesMap).filter(s => s.data.length > 0);

    VisualizationRenderer.renderTimeChart('chartTimeSvg', timeSeries, state.l1KB, state.l2KB);
    VisualizationRenderer.renderWorkChart('chartWorkSvg', workSeries);
  }

  // Handle Export CSV
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      if (state.resultsHistory.length === 0) {
        alert('No benchmark results to export. Run a benchmark first.');
        return;
      }
      const csv = BenchmarkEngine.generateCSV(state.resultsHistory);
      BenchmarkEngine.downloadCSV(csv);
    });
  }

  // Handle Reset
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      state.recordCount = 10000;
      state.recordSize = 64;
      state.l1KB = 32;
      state.l2KB = 256;
      state.trials = 3;
      state.targetMode = 'random';
      state.accessPattern = 'sequential';
      state.structures = ['linear', 'binary-arr', 'bst'];
      state.latestResults = [];
      state.resultsHistory = [];
      syncUIFromState();

      VisualizationRenderer.renderResultsTable([]);
      VisualizationRenderer.renderInterpretation([], state);
      VisualizationRenderer.renderTimeChart('chartTimeSvg', [], state.l1KB, state.l2KB);
      VisualizationRenderer.renderWorkChart('chartWorkSvg', []);

      if (btnExportCSV) btnExportCSV.disabled = true;
    });
  }

  // Window resize handler for SVG redraws
  window.addEventListener('resize', () => {
    updateChartsFromHistory();
  });

  // Initial Sync
  syncUIFromState();
  VisualizationRenderer.renderResultsTable([]);
});
