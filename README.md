# Cache-Aware Algorithm Analysis

**DAA TAE-1**  
**Student:** Arya Rewatkar  
**USN:** CM24073  

### Practical Topic

> "Evaluate how cache misses affect asymptotic notations. Measure the performance of linear and non-linear array search structures when processing records that exceed the system's L1/L2 cache capacity."

---

## 1. Project Overview

In traditional algorithm analysis, computational routines are modeled using the uniform-cost Random Access Machine (RAM) abstraction. Under this model, any memory access operation requires uniform O(1) time regardless of the memory address or access sequence.

In physical modern computer architectures, however, a multi-tiered memory hierarchy (comprising CPU registers, L1 cache, L2 cache, L3 cache, and DRAM) governs execution latency. Accessing the L1 data cache takes ~4–5 cycles, whereas a main memory cache miss stalls the CPU pipeline for ~200+ clock cycles.

This laboratory provides an empirical, client-side experimentation platform to evaluate how working sets crossing modeled L1 and L2 cache boundaries influence real search performance across contiguous and pointer-based data structures.

---

## 2. Problem Statement

Theoretical asymptotic notation describes the growth rate of an algorithm as input size N tends toward infinity. However, practical execution time is heavily influenced by CPU memory hierarchies, cache line spatial prefetching, and memory stalls.

This project investigates the divergence between theoretical Big-O predictions and real wall-clock latency when datasets exceed CPU cache capacities.

---

## 3. Objectives

* Implement real linear array, binary array, and binary search tree (BST) algorithms in browser JavaScript.
* Model working-set capacities (`Records × Record Size`) against configurable L1 (e.g. 32 KB) and L2 (e.g. 256 KB) boundaries.
* Measure wall-clock search latency with sub-millisecond precision using `performance.now()`.
* Track key comparisons and visited memory slots/nodes across sequential and irregular access patterns.
* Clarify that cache misses affect the **constant factors** and execution time, but do **not** alter the mathematical Big-O asymptotic class.

---

## 4. Research Question

> **"How does increasing the working-set size beyond estimated L1/L2 cache capacities influence the practical performance of different search structures?"**

```
Working Set Size (Bytes) = Record Count (N) × Record Size (Bytes)
```

---

## 5. Cache Hierarchy

Modern microprocessors use a tiered caching hierarchy to bridge the processor-memory speed gap:

```
+-----------------------------------------------------------+
|                     CPU Core Registers                    |
+-----------------------------------------------------------+
                             |  (~0.5 ns, 1 cycle)
+-----------------------------------------------------------+
|                   L1 Data Cache (32-64 KB)                |
+-----------------------------------------------------------+
                             |  (~1-1.5 ns, 4-5 cycles)
+-----------------------------------------------------------+
|                    L2 Cache (256-512 KB)                  |
+-----------------------------------------------------------+
                             |  (~4-6 ns, 12-14 cycles)
+-----------------------------------------------------------+
|                 L3 Shared Cache (8-32 MB)                 |
+-----------------------------------------------------------+
                             |  (~60-100 ns, 150-250 cycles)
+-----------------------------------------------------------+
|                  Main Memory / DRAM (GBs)                 |
+-----------------------------------------------------------+
```

---

## 6. L1 Cache

The Level 1 (L1) data cache is integrated directly into the processor core, operating at near-register speeds (32 KB to 64 KB per core). It provides single-digit clock cycle access times and serves as the immediate buffer for active memory operands.

---

## 7. L2 Cache

The Level 2 (L2) cache is larger (typically 256 KB to 512 KB per core) with moderate latency (~12–14 cycles). It buffers working sets that overflow L1 while preventing expensive external bus transactions to DRAM.

---

## 8. Cache Locality

* **Spatial Locality:** Accessing memory address k increases the likelihood of accessing nearby addresses (k+1, k+2). Contiguous array storage maximizes spatial locality because entire 64-byte cache lines are pre-fetched.
* **Temporal Locality:** Recently referenced data is likely to be referenced again in the near future.
* **Pointer Chasing:** Tree and graph structures scatter node allocations across heap memory, breaking spatial locality and triggering frequent cache evictions.

---

## 9. Working Set

The **working set** represents the total active memory footprint required during algorithm execution:

```
Working Set = Record Count (N) × Record Size (Bytes)
```

* **L1 Resident:** <= 32 KB (minimal latency)
* **L2 Resident:** 32 KB < Working Set <= 256 KB (moderate latency)
* **Beyond L2 (Main Memory):** > 256 KB (cache evictions and memory bus stalls)

---

## 10. Linear Search

* **Structure:** Contiguous typed buffer traversal.
* **Time Complexity:** Best O(1), Average O(n), Worst O(n).
* **Cache Characteristics:** Maximum spatial locality under sequential iteration; hardware prefetchers stream consecutive cache lines with near-zero latency.

---

## 11. Non-Linear Search (Binary Search Tree)

* **Structure:** Heap-allocated node objects linked via references (`{key, left, right, payload}`).
* **Time Complexity:** Best O(1), Average O(log n), Worst O(n).
* **Cache Characteristics:** Low spatial locality due to non-contiguous node allocation across heap memory.

---

## 12. Big-O Complexity

| Algorithm | Best Time | Average Time | Worst Time | Space (Auxiliary) | Memory Layout |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Linear Array Search** | O(1) | O(n) | O(n) | O(1) | Contiguous TypedArray |
| **Binary Search (Array)** | O(1) | O(log n) | O(log n) | O(1) | Sorted Contiguous Array |
| **Binary Search Tree** | O(1) | O(log n) | O(n) | O(n) Heap | Pointer-Linked Node Graph |

---

## 13. Cache Effects on Practical Runtime

> **Crucial Academic Takeaway:**  
> Cache misses do **NOT** change an algorithm's mathematical asymptotic class. Linear search remains O(n); balanced BST search remains O(log n).  
> However, cache capacity pressure dramatically inflates the physical constant factor c in the runtime equation T(n) = c * f(n), producing measurable latency shifts when working sets exceed cache boundaries.

---

## 14. Experimental Methodology

The experiment controls variables to isolate memory layout effects:

* **Independent Variables:** Record count N (100 to 200,000), record payload size (16B to 512B), data structure, access pattern (sequential vs. irregular).
* **Dependent Variables:** Measured execution time (ms), logical comparisons, visited nodes/records, modeled cache-pressure region.
* **Controlled Variables:** Identical key distributions, warm-up runs, statistical multi-trial repetitions.

---

## 15. Benchmarking Method

1. **Dataset Allocation:** Build typed contiguous buffer and balanced BST with payload padding in JavaScript heap memory.
2. **JIT Warm-Up:** Perform un-timed preliminary search passes to prime V8 engine optimizations.
3. **Timed Trials:** Execute multiple timed repetitions using `performance.now()`.
4. **Statistical Averaging:** Calculate mean and minimum execution times, filtering out warm-up outliers.

---

## 16. Execution-Time Measurement

Execution times are captured using high-resolution timestamps:

```javascript
const start = performance.now();
for (let i = 0; i < repetitions; i++) {
  SearchAlgorithms.linearSearch(...);
}
const end = performance.now();
const avgElapsedMs = (end - start) / repetitions;
```

---

## 17. Results Interpretation

* At small dataset sizes (<= 32 KB), contiguous array traversal benefits from high cache hit rates, remaining competitive with logarithmic search structures.
* As datasets scale beyond the estimated L2 cache capacity (> 256 KB), logarithmic algorithmic growth (O(log n)) dominates, while linear scans suffer proportional memory bandwidth overhead.
* Irregular memory access patterns noticeably increase linear traversal times due to loss of spatial prefetching.

---

## 18. Limitations & Technical Honesty

1. **No Direct Hardware PMCs:** Web browsers do not expose CPU Performance Monitoring Counters for security reasons. L1/L2 boundaries are modeled working-set thresholds.
2. **JIT Compilation Dynamics:** JavaScript engines (V8, SpiderMonkey) optimize loops dynamically.
3. **Garbage Collection (GC):** Heap object allocations are isolated prior to measurement windows.
4. **OS Multi-Tenancy:** Processor frequency scaling (DVFS) and background OS threads introduce timing noise.

---

## 19. Technology Stack

* **Structure:** Pure Semantic HTML5 (WCAG 2.1 AA compliant).
* **Styling:** Vanilla CSS3 (Custom responsive grid, fluid typography, no Tailwind).
* **Logic:** Vanilla JavaScript (ES6+ TypedArrays, zero frameworks).
* **Visualizations:** Zero-dependency responsive SVG chart renderers.

---

## 20. Project Structure

```
c:/Project/cache-analysis/
├── index.html            # Overview, Architectural Schematic, & DAA TAE-1 Info
├── lab.html              # Interactive Performance Laboratory & SVG Charts
├── about.html            # Methodology, Theoretical Analysis, & Practical Topic
├── README.md             # Complete Academic & Technical Documentation
├── css/
│   ├── style.css         # Accessible design system, colors, & global layout
│   ├── lab.css           # Workspace grid, controls, memory track, & charts
│   └── about.css         # Academic article layout, TOC, & diagrams
└── js/
    ├── searches.js       # Real Linear Array, BST, & Binary Array algorithms
    ├── benchmark.js      # Precision timing engine, warm-up, trials, & CSV
    ├── visualization.js  # Responsive SVG chart renderers & memory track bar
    └── app.js            # UI controller, state management, & event handlers
```

---

## 21. How to Run

1. Clone or download the repository.
2. Open `index.html` in any modern web browser.
3. No build tools, package installations (`npm`), or local servers are required.

---

## 22. GitHub Pages Deployment

1. Push this repository to GitHub.
2. Navigate to **Repository Settings > Pages**.
3. Under **Source**, select `Deploy from a branch` and choose the `main` branch root folder (`/`).
4. The site will be available at `https://<username>.github.io/<repository-name>/`.

---

## 23. Academic Relevance

This practical project connects Design and Analysis of Algorithms (DAA) theory with Computer Architecture concepts:
* Demonstrates why asymptotic analysis is foundational but incomplete for predicting concrete wall-clock latency.
* Bridges abstract algorithmic complexity with physical hardware cache lines, memory latency, and data locality.

---

## 24. Conclusion

Asymptotic Big-O notation remains the universal language for measuring algorithmic scaling. However, real-world software performance is constrained by memory hierarchies and spatial locality. Contiguous memory layouts maximize cache line utilization, whereas pointer-based structures trade spatial efficiency for logarithmic operation counts.
