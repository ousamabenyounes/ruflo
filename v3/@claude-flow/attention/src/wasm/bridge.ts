/**
 * @claude-flow/attention - WASM Bridge
 *
 * High-level bridge interface for WASM-accelerated attention operations.
 * Provides automatic fallback and performance optimization.
 */

import type {
  AttentionInput,
  AttentionOutput,
  AttentionMetadata,
  AttentionMechanismType,
  AttentionBackend,
  WASMInitOptions,
  FlashAttentionConfig,
  LinearAttentionConfig,
  HyperbolicAttentionConfig,
} from '../types.js';

import { loadWASM, isWASMAvailable, getWASMInstance } from './loader.js';

/**
 * High-level WASM bridge for attention operations
 */
export class WASMBridge {
  private initialized = false;
  private wasmAvailable = false;

  /**
   * Initialize the WASM bridge
   */
  static async init(options?: WASMInitOptions): Promise<WASMBridge> {
    const bridge = new WASMBridge();
    await bridge.initialize(options);
    return bridge;
  }

  /**
   * Initialize WASM module
   */
  async initialize(options?: WASMInitOptions): Promise<void> {
    if (this.initialized) return;

    const wasm = await loadWASM(options);
    this.wasmAvailable = wasm !== null;
    this.initialized = true;
  }

  /**
   * Check if WASM acceleration is available
   */
  isAccelerated(): boolean {
    return this.wasmAvailable;
  }

  /**
   * Get the backend being used
   */
  getBackend(): AttentionBackend {
    return this.wasmAvailable ? 'wasm' : 'typescript';
  }

  /**
   * Compute dot product attention
   */
  dotProductAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    options?: { seqLen?: number; dim?: number }
  ): AttentionOutput {
    const startTime = performance.now();
    const wasm = getWASMInstance();
    const dim = options?.dim ?? query.length;
    const seqLen = options?.seqLen ?? keys.length / dim;

    let output: Float32Array;
    let backend: AttentionBackend = 'typescript';

    if (wasm) {
      output = wasm.dotProductAttention(query, keys, values, seqLen, dim);
      backend = 'wasm';
    } else {
      output = this.dotProductAttentionJS(query, keys, values, seqLen, dim);
    }

    const latencyMs = performance.now() - startTime;

    return {
      output,
      metadata: {
        mechanism: 'standard-mha',
        backend,
        latencyMs,
        memoryBytes: output.byteLength,
        sequenceLength: seqLen,
        wasmAccelerated: backend === 'wasm',
      },
    };
  }

  /**
   * Compute Flash Attention (memory-efficient)
   */
  flashAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    config?: FlashAttentionConfig
  ): AttentionOutput {
    const startTime = performance.now();
    const wasm = getWASMInstance();
    const dim = config?.embedDim ?? query.length;
    const seqLen = keys.length / dim;
    const causal = config?.causal ?? false;

    let output: Float32Array;
    let backend: AttentionBackend = 'typescript';

    if (wasm) {
      output = wasm.flashAttention(query, keys, values, seqLen, dim, causal);
      backend = 'wasm';
    } else {
      output = this.flashAttentionJS(query, keys, values, seqLen, dim, causal);
    }

    const latencyMs = performance.now() - startTime;

    return {
      output,
      metadata: {
        mechanism: 'flash-attention-v2',
        backend,
        latencyMs,
        memoryBytes: output.byteLength,
        sequenceLength: seqLen,
        wasmAccelerated: backend === 'wasm',
      },
    };
  }

  /**
   * Compute Linear Attention (O(n) complexity)
   */
  linearAttention(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    config?: LinearAttentionConfig
  ): AttentionOutput {
    const startTime = performance.now();
    const wasm = getWASMInstance();
    const dim = config?.embedDim ?? query.length;
    const seqLen = keys.length / dim;
    const numFeatures = config?.numFeatures ?? 256;

    let output: Float32Array;
    let backend: AttentionBackend = 'typescript';

    if (wasm) {
      output = wasm.linearAttention(query, keys, values, seqLen, dim, numFeatures);
      backend = 'wasm';
    } else {
      output = this.linearAttentionJS(query, keys, values, seqLen, dim, numFeatures);
    }

    const latencyMs = performance.now() - startTime;

    return {
      output,
      metadata: {
        mechanism: 'linear-attention',
        backend,
        latencyMs,
        memoryBytes: output.byteLength,
        sequenceLength: seqLen,
        wasmAccelerated: backend === 'wasm',
      },
    };
  }

  /**
   * Compute Hyperbolic (Poincaré) distance
   */
  hyperbolicDistance(
    x: Float32Array,
    y: Float32Array,
    config?: HyperbolicAttentionConfig
  ): number {
    const wasm = getWASMInstance();
    const curvature = config?.curvature ?? -1.0;

    if (wasm) {
      return wasm.poincareDistance(x, y, curvature);
    }
    return this.poincareDistanceJS(x, y, curvature);
  }

  /**
   * HNSW-accelerated nearest neighbor search
   */
  hnswSearch(
    query: Float32Array,
    k: number,
    efSearch?: number
  ): { indices: Uint32Array; distances: Float32Array } {
    const wasm = getWASMInstance();
    if (wasm) {
      return wasm.hnswSearch(query, k, efSearch);
    }
    // Return empty for fallback
    return {
      indices: new Uint32Array(k),
      distances: new Float32Array(k).fill(Infinity),
    };
  }

  /**
   * Generic forward pass with auto-selection
   */
  async forward(
    input: AttentionInput,
    mechanism?: AttentionMechanismType
  ): Promise<AttentionOutput> {
    const query = this.toFloat32Array(input.query);
    const keys = this.toFloat32Array(input.key);
    const values = this.toFloat32Array(input.value);

    // Auto-select mechanism based on sequence length
    const seqLen = Array.isArray(input.key) ? input.key.length : keys.length / query.length;
    const selectedMechanism = mechanism ?? this.selectMechanism(seqLen);

    switch (selectedMechanism) {
      case 'flash-attention-v2':
      case 'flash-attention-v3':
      case 'flash-decoding':
        return this.flashAttention(query, keys, values);

      case 'linear-attention':
      case 'performer-attention':
      case 'linformer-attention':
        return this.linearAttention(query, keys, values);

      default:
        return this.dotProductAttention(query, keys, values);
    }
  }

  /**
   * Select optimal mechanism based on sequence length
   */
  private selectMechanism(seqLen: number): AttentionMechanismType {
    if (seqLen > 8192) {
      return 'linear-attention';
    }
    if (seqLen > 2048) {
      return 'flash-attention-v2';
    }
    return 'standard-mha';
  }

  // ============================================================================
  // JavaScript Fallback Implementations
  // ============================================================================

  private toFloat32Array(
    input: Float32Array | number[] | number[][]
  ): Float32Array {
    if (input instanceof Float32Array) {
      return input;
    }
    if (Array.isArray(input) && Array.isArray(input[0])) {
      // Flatten 2D array
      const flat = (input as number[][]).flat();
      return new Float32Array(flat);
    }
    return new Float32Array(input as number[]);
  }

  private dotProductAttentionJS(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number
  ): Float32Array {
    const scale = 1 / Math.sqrt(dim);
    const output = new Float32Array(dim);
    const scores = new Float32Array(seqLen);

    for (let i = 0; i < seqLen; i++) {
      let score = 0;
      for (let j = 0; j < dim; j++) {
        score += query[j] * keys[i * dim + j];
      }
      scores[i] = score * scale;
    }

    const maxScore = Math.max(...scores);
    let sumExp = 0;
    for (let i = 0; i < seqLen; i++) {
      scores[i] = Math.exp(scores[i] - maxScore);
      sumExp += scores[i];
    }
    for (let i = 0; i < seqLen; i++) {
      scores[i] /= sumExp;
    }

    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < dim; j++) {
        output[j] += scores[i] * values[i * dim + j];
      }
    }

    return output;
  }

  private flashAttentionJS(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number,
    causal: boolean
  ): Float32Array {
    const blockSize = 64;
    const scale = 1 / Math.sqrt(dim);
    const output = new Float32Array(dim);
    const numBlocks = Math.ceil(seqLen / blockSize);

    let maxScore = -Infinity;
    let sumExp = 0;
    const weightedSum = new Float32Array(dim);

    for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
      const blockStart = blockIdx * blockSize;
      const blockEnd = Math.min(blockStart + blockSize, seqLen);

      const blockScores = new Float32Array(blockEnd - blockStart);
      for (let i = blockStart; i < blockEnd; i++) {
        if (causal && i > seqLen - 1) {
          blockScores[i - blockStart] = -Infinity;
          continue;
        }
        let score = 0;
        for (let j = 0; j < dim; j++) {
          score += query[j] * keys[i * dim + j];
        }
        blockScores[i - blockStart] = score * scale;
      }

      const blockMax = Math.max(...blockScores);
      if (blockMax > maxScore) {
        const rescale = Math.exp(maxScore - blockMax);
        sumExp *= rescale;
        for (let j = 0; j < dim; j++) {
          weightedSum[j] *= rescale;
        }
        maxScore = blockMax;
      }

      for (let i = blockStart; i < blockEnd; i++) {
        const localIdx = i - blockStart;
        const weight = Math.exp(blockScores[localIdx] - maxScore);
        sumExp += weight;
        for (let j = 0; j < dim; j++) {
          weightedSum[j] += weight * values[i * dim + j];
        }
      }
    }

    for (let j = 0; j < dim; j++) {
      output[j] = weightedSum[j] / sumExp;
    }

    return output;
  }

  private linearAttentionJS(
    query: Float32Array,
    keys: Float32Array,
    values: Float32Array,
    seqLen: number,
    dim: number,
    numFeatures: number
  ): Float32Array {
    const output = new Float32Array(dim);
    const applyFeatureMap = (x: number): number => (x > 0 ? x + 1 : Math.exp(x));

    const phiQ = new Float32Array(dim);
    for (let i = 0; i < dim; i++) {
      phiQ[i] = applyFeatureMap(query[i]);
    }

    const kvSum = new Float32Array(dim * dim);
    const kSum = new Float32Array(dim);

    for (let i = 0; i < seqLen; i++) {
      const phiK = new Float32Array(dim);
      for (let j = 0; j < dim; j++) {
        phiK[j] = applyFeatureMap(keys[i * dim + j]);
        kSum[j] += phiK[j];
      }

      for (let j = 0; j < dim; j++) {
        for (let k = 0; k < dim; k++) {
          kvSum[j * dim + k] += phiK[j] * values[i * dim + k];
        }
      }
    }

    let denom = 0;
    for (let i = 0; i < dim; i++) {
      denom += phiQ[i] * kSum[i];
    }

    for (let j = 0; j < dim; j++) {
      let num = 0;
      for (let i = 0; i < dim; i++) {
        num += phiQ[i] * kvSum[i * dim + j];
      }
      output[j] = num / (denom + 1e-6);
    }

    return output;
  }

  private poincareDistanceJS(x: Float32Array, y: Float32Array, c: number): number {
    let normX = 0;
    let normY = 0;
    let normDiff = 0;

    for (let i = 0; i < x.length; i++) {
      normX += x[i] * x[i];
      normY += y[i] * y[i];
      const diff = x[i] - y[i];
      normDiff += diff * diff;
    }

    normX = Math.sqrt(normX);
    normY = Math.sqrt(normY);
    normDiff = Math.sqrt(normDiff);

    const sqrtC = Math.sqrt(Math.abs(c));
    const num = 2 * normDiff * normDiff;
    const denom = (1 - normX * normX) * (1 - normY * normY);

    return (1 / sqrtC) * Math.acosh(1 + num / Math.max(denom, 1e-6));
  }
}
