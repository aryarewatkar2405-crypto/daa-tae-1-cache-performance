/**
 * Cache Lab - Data Visualizations & Rendering
 * High-performance, lightweight SVG/Canvas charts and memory hierarchy bars.
 * Zero external library dependencies.
 */

class VisualizationRenderer {
  /**
   * Update the horizontal working-set capacity track and metric indicators.
   */
  static updateMemoryHierarchyBar(workingSetKB, l1KB, l2KB) {
    const wsValEl = document.getElementById('metricWorkingSet');
    const wsBytesEl = document.getElementById('metricWorkingSetBytes');
    const wsStatusEl = document.getElementById('metricStatusBadge');
    const pointerEl = document.getElementById('workingSetPointer');
    const segL1El = document.getElementById('segL1');
    const segL2El = document.getElementById('segL2');
    const segRamEl = document.getElementById('segRam');

    if (!wsValEl || !pointerEl) return;

    // Format numbers
    if (workingSetKB >= 1024) {
      wsValEl.textContent = `${(workingSetKB / 1024).toFixed(2)} MB`;
    } else {
      wsValEl.textContent = `${workingSetKB.toFixed(1)} KB`;
    }
    wsBytesEl.textContent = `${Math.round(workingSetKB * 1024).toLocaleString()} bytes`;

    // Classify region
    const region = BenchmarkEngine.classifyRegion(workingSetKB, l1KB, l2KB);
    wsStatusEl.className = `badge ${region.class}`;
    wsStatusEl.textContent = region.label;

    // Calculate visual track segment proportions
    // Maximum scale baseline is 2x L2 capacity or at least 1.5x current working set
    const maxScaleKB = Math.max(l2KB * 2.5, workingSetKB * 1.35, 512);

    const l1Pct = (l1KB / maxScaleKB) * 100;
    const l2Pct = ((l2KB - l1KB) / maxScaleKB) * 100;

    if (segL1El) {
      segL1El.style.left = '0%';
      segL1El.style.width = `${Math.max(15, l1Pct)}%`;
    }
    if (segL2El) {
      segL2El.style.left = `${Math.max(15, l1Pct)}%`;
      segL2El.style.width = `${Math.max(25, l2Pct)}%`;
    }
    if (segRamEl) {
      const ramLeft = Math.max(15, l1Pct) + Math.max(25, l2Pct);
      segRamEl.style.left = `${ramLeft}%`;
    }

    // Position pointer on track
    let pointerPct = 0;
    if (workingSetKB <= l1KB) {
      // Scale inside L1 segment
      pointerPct = (workingSetKB / l1KB) * Math.max(15, l1Pct);
    } else if (workingSetKB <= l2KB) {
      // Scale inside L2 segment
      const segStart = Math.max(15, l1Pct);
      const segWidth = Math.max(25, l2Pct);
      pointerPct = segStart + ((workingSetKB - l1KB) / (l2KB - l1KB)) * segWidth;
    } else {
      // Scale inside RAM segment
      const segStart = Math.max(15, l1Pct) + Math.max(25, l2Pct);
      const remainingWidth = 100 - segStart;
      const progressBeyondL2 = Math.min(1, (workingSetKB - l2KB) / (maxScaleKB - l2KB));
      pointerPct = segStart + progressBeyondL2 * remainingWidth * 0.95;
    }

    pointerEl.style.left = `${Math.min(99, Math.max(1, pointerPct))}%`;
  }

  /**
   * Render benchmark results to the data table.
   */
  static renderResultsTable(results) {
    const tbody = document.getElementById('resultsTableBody');
    if (!tbody) return;

    if (!results || results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No benchmark data recorded yet. Configure parameters and run a benchmark above.</td></tr>`;
      return;
    }

    tbody.innerHTML = results.map(r => {
      return `
        <tr>
          <td>
            <strong>${r.name}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.complexity}</div>
          </td>
          <td class="mono-num">${r.workingSetKB.toFixed(1)} KB</td>
          <td class="mono-num"><strong>${r.avgTimeMs.toFixed(4)} ms</strong></td>
          <td class="mono-num" style="color: var(--text-muted);">${r.minTimeMs.toFixed(4)} ms</td>
          <td class="mono-num">${r.comparisons.toLocaleString()}</td>
          <td class="mono-num">${r.accesses.toLocaleString()}</td>
          <td><span class="badge ${r.region.class}">${r.region.label}</span></td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render Dynamic Analytical Summary based on actual measured empirical data.
   */
  static renderInterpretation(results, config) {
    const container = document.getElementById('interpretationContainer');
    const bodyEl = document.getElementById('interpretationText');
    if (!container || !bodyEl) return;

    if (!results || results.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    const linearRes = results.find(r => r.id === 'linear');
    const bstRes = results.find(r => r.id === 'bst');
    const binaryArrRes = results.find(r => r.id === 'binary-arr');

    let analysis = '';
    const wsKB = results[0].workingSetKB;
    const l1KB = config.l1KB;
    const l2KB = config.l2KB;

    if (wsKB <= l1KB) {
      analysis += `The current working set (${wsKB.toFixed(1)} KB) sits comfortably inside the modeled L1 cache (${l1KB} KB). At this scale, memory access latencies remain minimal across all structures. `;
    } else if (wsKB <= l2KB) {
      analysis += `The current working set (${wsKB.toFixed(1)} KB) exceeds the modeled L1 cache but resides within the modeled L2 cache (${l2KB} KB). Constant factors and cache-line fill behavior start to differentiate sequential array scans from pointer traversals. `;
    } else {
      analysis += `The current working set (${wsKB.toFixed(1)} KB) exceeds the modeled L2 capacity (${l2KB} KB), entering the main-memory pressure region. Under this pressure, cache line evictions occur frequently. `;
    }

    if (linearRes && bstRes) {
      analysis += `Linear search executed ${linearRes.comparisons.toLocaleString()} comparisons in sequential contiguous memory, while the balanced BST completed search in just ${bstRes.comparisons} node comparisons. `;
      if (linearRes.avgTimeMs < bstRes.avgTimeMs && wsKB < l1KB) {
        analysis += `Notably, despite the BST's superior O(log n) theoretical complexity, contiguous array streaming had high hardware cache efficiency at small scale, keeping execution times competitive. `;
      } else {
        analysis += `As input size grows, the logarithmic algorithmic complexity O(log n) of the BST and Binary Array Search strongly dominates raw instruction count over linear O(n). `;
      }
    }

    if (config.accessPattern === 'irregular' && linearRes) {
      analysis += `With irregular memory access enabled, the linear traversal loses spatial prefetching efficiency, highlighting how non-sequential memory strides impact practical execution time.`;
    }

    bodyEl.textContent = analysis;
  }

  /**
   * Render SVG Chart: Working Set Size vs Execution Time
   */
  static renderTimeChart(svgId, datasetPoints, l1KB, l2KB) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    if (!datasetPoints || datasetPoints.length === 0) {
      svg.innerHTML = `
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="13">
          Run a Single Benchmark or Scaling Experiment to generate runtime curves.
        </text>
      `;
      return;
    }

    const width = svg.clientWidth || svg.parentElement?.clientWidth || 600;
    const height = 280;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const padLeft = 60;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 40;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Collect all X (Working Set KB) and Y (Time ms)
    let minX = Infinity, maxX = -Infinity;
    let minY = 0, maxY = -Infinity;

    datasetPoints.forEach(series => {
      series.data.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    if (minX === Infinity) minX = 0;
    if (maxX <= minX) maxX = minX + 10;
    if (maxY <= 0) maxY = 0.01;
    maxY *= 1.15; // 15% head room

    const getX = (val) => padLeft + ((val - minX) / (maxX - minX)) * plotW;
    const getY = (val) => padTop + plotH - (val / maxY) * plotH;

    let svgHtml = '';

    // Background grid lines
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const yVal = (maxY / yTicks) * i;
      const yPos = getY(yVal);
      svgHtml += `
        <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="${padLeft - 8}" y="${yPos + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)">${yVal.toFixed(3)}</text>
      `;
    }

    // X Axis ticks
    const xTicks = Math.min(6, datasetPoints[0]?.data.length || 4);
    for (let i = 0; i < xTicks; i++) {
      const xVal = minX + ((maxX - minX) / (xTicks - 1 || 1)) * i;
      const xPos = getX(xVal);
      svgHtml += `
        <line x1="${xPos}" y1="${padTop}" x2="${xPos}" y2="${padTop + plotH}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="2,2" />
        <text x="${xPos}" y="${height - padBottom + 16}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)">${xVal.toFixed(0)} KB</text>
      `;
    }

    // Vertical boundary lines for L1 and L2
    if (l1KB >= minX && l1KB <= maxX) {
      const l1X = getX(l1KB);
      svgHtml += `
        <line x1="${l1X}" y1="${padTop}" x2="${l1X}" y2="${padTop + plotH}" stroke="var(--state-l1)" stroke-width="1.5" stroke-dasharray="4,3" />
        <text x="${l1X + 4}" y="${padTop + 14}" font-size="10" font-weight="700" fill="var(--state-l1)">L1 (${l1KB} KB)</text>
      `;
    }

    if (l2KB >= minX && l2KB <= maxX) {
      const l2X = getX(l2KB);
      svgHtml += `
        <line x1="${l2X}" y1="${padTop}" x2="${l2X}" y2="${padTop + plotH}" stroke="var(--state-l2)" stroke-width="1.5" stroke-dasharray="4,3" />
        <text x="${l2X + 4}" y="${padTop + 28}" font-size="10" font-weight="700" fill="var(--state-l2)">L2 (${l2KB} KB)</text>
      `;
    }

    // Axis Lines
    svgHtml += `
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--border-strong)" stroke-width="1.5" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="var(--border-strong)" stroke-width="1.5" />
      <text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Working Set Size (KB)</text>
      <text transform="rotate(-90)" x="${-(padTop + plotH / 2)}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Execution Time (ms)</text>
    `;

    // Series Lines and Points
    datasetPoints.forEach(series => {
      const color = series.color;
      let pathD = '';
      series.data.forEach((pt, idx) => {
        const px = getX(pt.x);
        const py = getY(pt.y);
        if (idx === 0) pathD += `M ${px} ${py}`;
        else pathD += ` L ${px} ${py}`;
      });

      svgHtml += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" />`;

      // Draw points
      series.data.forEach(pt => {
        const px = getX(pt.x);
        const py = getY(pt.y);
        svgHtml += `
          <circle cx="${px}" cy="${py}" r="4" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" class="chart-point" data-series="${series.name}" data-x="${pt.x}" data-y="${pt.y.toFixed(4)}" />
        `;
      });
    });

    svg.innerHTML = svgHtml;
    this.attachTooltips(svg);
  }

  /**
   * Render SVG Chart: Search Work (Comparisons / Accesses) vs Dataset Size
   */
  static renderWorkChart(svgId, datasetPoints) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    if (!datasetPoints || datasetPoints.length === 0) {
      svg.innerHTML = `
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="13">
          Run scaling experiment to view logical comparison growth curves.
        </text>
      `;
      return;
    }

    const width = svg.clientWidth || svg.parentElement?.clientWidth || 600;
    const height = 280;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const padLeft = 60;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 40;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    let minX = Infinity, maxX = -Infinity;
    let maxY = -Infinity;

    datasetPoints.forEach(series => {
      series.data.forEach(pt => {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      });
    });

    if (minX === Infinity) minX = 0;
    if (maxX <= minX) maxX = minX + 10;
    if (maxY <= 0) maxY = 10;
    maxY *= 1.1;

    const getX = (val) => padLeft + ((val - minX) / (maxX - minX)) * plotW;
    const getY = (val) => padTop + plotH - (val / maxY) * plotH;

    let svgHtml = '';

    // Y Grid lines
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const yVal = (maxY / yTicks) * i;
      const yPos = getY(yVal);
      svgHtml += `
        <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="var(--border-subtle)" stroke-width="1" />
        <text x="${padLeft - 8}" y="${yPos + 4}" text-anchor="end" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)">${Math.round(yVal).toLocaleString()}</text>
      `;
    }

    // X Axis ticks
    const xTicks = Math.min(6, datasetPoints[0]?.data.length || 4);
    for (let i = 0; i < xTicks; i++) {
      const xVal = minX + ((maxX - minX) / (xTicks - 1 || 1)) * i;
      const xPos = getX(xVal);
      svgHtml += `
        <line x1="${xPos}" y1="${padTop}" x2="${xPos}" y2="${padTop + plotH}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="2,2" />
        <text x="${xPos}" y="${height - padBottom + 16}" text-anchor="middle" font-size="10" fill="var(--text-muted)" font-family="var(--font-mono)">${Math.round(xVal).toLocaleString()}</text>
      `;
    }

    // Axis Lines
    svgHtml += `
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - padRight}" y2="${padTop + plotH}" stroke="var(--border-strong)" stroke-width="1.5" />
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="var(--border-strong)" stroke-width="1.5" />
      <text x="${width / 2}" y="${height - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Number of Records (N)</text>
      <text transform="rotate(-90)" x="${-(padTop + plotH / 2)}" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Logical Comparisons</text>
    `;

    // Series Lines and Points
    datasetPoints.forEach(series => {
      const color = series.color;
      let pathD = '';
      series.data.forEach((pt, idx) => {
        const px = getX(pt.x);
        const py = getY(pt.y);
        if (idx === 0) pathD += `M ${px} ${py}`;
        else pathD += ` L ${px} ${py}`;
      });

      svgHtml += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" />`;

      series.data.forEach(pt => {
        const px = getX(pt.x);
        const py = getY(pt.y);
        svgHtml += `
          <circle cx="${px}" cy="${py}" r="4" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" class="chart-point" data-series="${series.name}" data-x="${pt.x}" data-y="${Math.round(pt.y).toLocaleString()}" />
        `;
      });
    });

    svg.innerHTML = svgHtml;
    this.attachTooltips(svg);
  }

  /**
   * Attach tooltip mouse events to SVG chart points.
   */
  static attachTooltips(svg) {
    let tooltip = document.getElementById('chartTooltipGlobal');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chartTooltipGlobal';
      tooltip.className = 'chart-tooltip';
      document.body.appendChild(tooltip);
    }

    const points = svg.querySelectorAll('.chart-point');
    points.forEach(pt => {
      pt.addEventListener('mouseenter', (e) => {
        const series = pt.getAttribute('data-series');
        const x = pt.getAttribute('data-x');
        const y = pt.getAttribute('data-y');
        tooltip.innerHTML = `<strong>${series}</strong><br/>X: ${x}<br/>Y: ${y}`;
        tooltip.style.opacity = '1';
        const rect = pt.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX + 10}px`;
        tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
      });

      pt.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  }
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.VisualizationRenderer = VisualizationRenderer;
}
