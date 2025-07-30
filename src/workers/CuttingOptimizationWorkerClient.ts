import { PartWithQuantity } from '../core/v6/models/Part';
import { Material, PlacementResult } from '../core/v6/models/Material';

interface WorkerMessage {
  type: 'optimize' | 'cancel' | 'progress';
  id: string;
  data?: any;
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  id: string;
  result?: PlacementResult;
  error?: string;
  progress?: number;
}

interface OptimizeOptions {
  onProgress?: (progress: number) => void;
  angleTolerance?: number;
}

/**
 * Web Worker 客戶端
 * 用於在後台執行緒執行切割優化計算
 */
export class CuttingOptimizationWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, {
    resolve: (result: PlacementResult) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: number) => void;
  }> = new Map();
  
  private requestIdCounter = 0;
  private terminated = false;

  constructor() {
    this.initializeWorker();
  }

  /**
   * 執行優化計算
   */
  async optimize(
    parts: PartWithQuantity[],
    materials: Material[],
    options?: OptimizeOptions
  ): Promise<PlacementResult> {
    console.log('[WorkerClient] 開始優化請求，零件數：', parts.length, '材料數：', materials.length);
    
    if (this.terminated) {
      throw new Error('Worker已終止');
    }

    if (!this.worker) {
      console.error('[WorkerClient] Worker 未初始化');
      throw new Error('Worker 未初始化');
    }

    const requestId = `req_${this.requestIdCounter++}`;
    
    return new Promise((resolve, reject) => {
      console.log('[WorkerClient] 發送請求到 Worker，ID：', requestId);
      
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        onProgress: options?.onProgress
      });

      this.worker?.postMessage({
        type: 'optimize',
        id: requestId,
        data: {
          parts,
          materials,
          angleTolerance: options?.angleTolerance
        }
      } as WorkerMessage);
    });
  }

  /**
   * 取消當前的優化計算
   */
  cancel(): void {
    if (this.worker) {
      // 拒絕所有待處理的請求
      this.pendingRequests.forEach(({ reject }) => {
        reject(new Error('優化已取消'));
      });
      this.pendingRequests.clear();
      
      // 發送取消訊息給 Worker
      this.worker.postMessage({
        type: 'cancel'
      } as WorkerMessage);
    }
  }

  /**
   * 終止 Worker
   */
  terminate(): void {
    if (this.terminated) return;
    
    this.terminated = true;
    
    // 拒絕所有待處理的請求
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Worker已終止'));
    });
    this.pendingRequests.clear();
    
    // 終止 Worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    try {
      // 在測試環境中，Worker 可能是 mock 的
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(
          new URL('./cutting-optimization.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = this.handleWorkerError.bind(this);
      }
    } catch (error) {
      console.error('無法初始化 Worker:', error);
      // 在不支援 Worker 的環境中，可以降級到同步執行
    }
  }

  /**
   * 處理 Worker 訊息
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, id, result, error, progress } = event.data;
    console.log('[WorkerClient] 收到 Worker 消息：', type, 'ID：', id, 'progress：', progress);
    
    const request = this.pendingRequests.get(id);
    
    if (!request) {
      console.warn('[WorkerClient] 找不到對應的請求：', id);
      return;
    }

    switch (type) {
      case 'result':
        if (result) {
          console.log('[WorkerClient] 收到結果，已排版零件數：', result.placedParts?.length);
          request.resolve(result);
          this.pendingRequests.delete(id);
        }
        break;
        
      case 'error':
        console.error('[WorkerClient] 收到錯誤：', error);
        request.reject(new Error(error || '未知錯誤'));
        this.pendingRequests.delete(id);
        break;
        
      case 'progress':
        if (progress !== undefined && request.onProgress) {
          request.onProgress(progress);
        }
        break;
    }
  }

  /**
   * 處理 Worker 錯誤
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker 錯誤:', error);
    
    // 拒絕所有待處理的請求
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error(`Worker 錯誤: ${error.message}`));
    });
    this.pendingRequests.clear();
    
    // 嘗試重新初始化 Worker
    if (!this.terminated) {
      this.initializeWorker();
    }
  }

  /**
   * 檢查是否支援 Web Worker
   */
  static isSupported(): boolean {
    return typeof Worker !== 'undefined';
  }
}