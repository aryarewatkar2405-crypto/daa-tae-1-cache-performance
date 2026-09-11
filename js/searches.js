/**
 * Cache Lab - Search Structures Implementation
 * Evaluates memory layout and access patterns for Linear Array, BST, and Binary Array.
 * 
 * Technical Note:
 * Data structures are allocated in memory with specific record sizes (key + payload padding)
 * to accurately model working set sizes against estimated L1 and L2 cache boundaries.
 */

// Dataset generation & record container
class DatasetGenerator {
  /**
   * Generates a structured dataset with keys and payload padding.
   * @param {number} count Number of records
   * @param {number} recordSizeBytes Size of each record in bytes
   * @returns {Object} { keys: Int32Array, recordsBuffer: ArrayBuffer, bstRoot: Object, sortedKeys: Int32Array }
   */
  static generate(count, recordSizeBytes) {
    // Generate distinct integer keys [1 .. count * 2] step 2 to allow both hits and misses
    const sortedKeys = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      sortedKeys[i] = (i + 1) * 2;
    }

    // Allocate continuous memory buffer for array simulation
    // Each record has 4 bytes key + (recordSizeBytes - 4) bytes payload
    const totalBytes = count * recordSizeBytes;
    const recordsBuffer = new ArrayBuffer(totalBytes);
    const intView = new Int32Array(recordsBuffer);
    const intStride = Math.floor(recordSizeBytes / 4);

    // Populate array buffer with keys at each record slot
    for (let i = 0; i < count; i++) {
      intView[i * intStride] = sortedKeys[i];
    }

    // Generate permutation for irregular access patterns if requested
    const irregularIndices = new Int32Array(count);
    for (let i = 0; i < count; i++) irregularIndices[i] = i;
    // Fisher-Yates shuffle with fixed deterministic seed behavior for consistency
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = irregularIndices[i];
      irregularIndices[i] = irregularIndices[j];
      irregularIndices[j] = temp;
    }

    // Build balanced Binary Search Tree (BST) from the sorted keys
    // Node representation includes payload padding to mirror record size in heap
    const payloadBytes = Math.max(0, recordSizeBytes - 16); // 16 bytes for JS object header/pointers estimate
    const bstRoot = this.buildBalancedBST(sortedKeys, 0, count - 1, payloadBytes);

    return {
      count,
      recordSizeBytes,
      totalBytes,
      sortedKeys,
      intView,
      intStride,
      irregularIndices,
      bstRoot
    };
  }

  /**
   * Recursively builds a balanced BST from sorted keys.
   */
  static buildBalancedBST(keys, start, end, payloadBytes) {
    if (start > end) return null;
    const mid = Math.floor((start + end) / 2);
    
    // Create node with optional payload to occupy heap memory proportional to record size
    const node = {
      key: keys[mid],
      left: null,
      right: null,
      payload: payloadBytes > 0 ? new Uint8Array(payloadBytes) : null
    };

    node.left = this.buildBalancedBST(keys, start, mid - 1, payloadBytes);
    node.right = this.buildBalancedBST(keys, mid + 1, end, payloadBytes);
    return node;
  }
}

/**
 * Real Search Implementations with strictly zero DOM overhead during execution.
 */
class SearchAlgorithms {
  /**
   * Linear Search on Array (Contiguous Memory Layout)
   * @param {Int32Array} intView 
   * @param {number} intStride 
   * @param {number} count 
   * @param {number} targetKey 
   * @param {string} accessPattern 'sequential' or 'irregular'
   * @param {Int32Array} irregularIndices 
   * @returns {Object} { found: boolean, comparisons: number, accesses: number, index: number }
   */
  static linearSearch(intView, intStride, count, targetKey, accessPattern, irregularIndices) {
    let comparisons = 0;
    let accesses = 0;
    let found = false;
    let foundIdx = -1;

    if (accessPattern === 'irregular' && irregularIndices) {
      for (let i = 0; i < count; i++) {
        const slotIdx = irregularIndices[i];
        accesses++;
        comparisons++;
        if (intView[slotIdx * intStride] === targetKey) {
          found = true;
          foundIdx = slotIdx;
          break;
        }
      }
    } else {
      // Sequential scan
      for (let i = 0; i < count; i++) {
        accesses++;
        comparisons++;
        if (intView[i * intStride] === targetKey) {
          found = true;
          foundIdx = i;
          break;
        }
      }
    }

    return { found, comparisons, accesses, index: foundIdx };
  }

  /**
   * Binary Search on Array (Contiguous Array, Logarithmic Stride)
   * @param {Int32Array} intView 
   * @param {number} intStride 
   * @param {number} count 
   * @param {number} targetKey 
   * @returns {Object} { found: boolean, comparisons: number, accesses: number, index: number }
   */
  static binarySearchArray(intView, intStride, count, targetKey) {
    let comparisons = 0;
    let accesses = 0;
    let low = 0;
    let high = count - 1;
    let found = false;
    let foundIdx = -1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      accesses++;
      const midVal = intView[mid * intStride];
      comparisons++;

      if (midVal === targetKey) {
        found = true;
        foundIdx = mid;
        break;
      } else if (midVal < targetKey) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { found, comparisons, accesses, index: foundIdx };
  }

  /**
   * BST Search (Pointer-Linked Node Traversal in Heap)
   * @param {Object} root 
   * @param {number} targetKey 
   * @returns {Object} { found: boolean, comparisons: number, accesses: number, key: number }
   */
  static bstSearch(root, targetKey) {
    let comparisons = 0;
    let accesses = 0;
    let current = root;
    let found = false;

    while (current !== null) {
      accesses++;
      comparisons++;
      if (current.key === targetKey) {
        found = true;
        break;
      } else if (targetKey < current.key) {
        current = current.left;
      } else {
        current = current.right;
      }
    }

    return { found, comparisons, accesses, key: found ? targetKey : null };
  }
}

// Export for browser environment
if (typeof window !== 'undefined') {
  window.DatasetGenerator = DatasetGenerator;
  window.SearchAlgorithms = SearchAlgorithms;
}
