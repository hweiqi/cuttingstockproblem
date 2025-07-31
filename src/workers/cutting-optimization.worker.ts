import { V6System } from '../core/v6/system/V6System';
import { PartWithQuantity } from '../core/v6/models/Part';
import { Material, PlacementResult } from '../core/v6/models/Material';

interface WorkerMessage {
  type: 'optimize' | 'cancel';
  id: string;
  data?: {
    parts: PartWithQuantity[];
    materials: Material[];
    angleTolerance?: number;
  };
}

interface WorkerResponse {
  type: 'result' | 'error' | 'progress';
  id: string;
  result?: PlacementResult;
  error?: string;
  progress?: number;
}

// Worker 上下文
const ctx: Worker = self as any;

// 優化系統實例
let v6System: V6System | null = null;
let currentRequestId: string | null = null;
let cancelled = false;

/**
 * 處理優化請求
 */
async function handleOptimize(
  id: string,
  parts: PartWithQuantity[],
  materials: Material[],
  angleTolerance?: number
): Promise<void> {
  currentRequestId = id;
  cancelled = false;

  try {
    // 初始化或更新系統
    if (!v6System || angleTolerance !== undefined) {
      v6System = new V6System({ angleTolerance });
    }

    // 發送初始進度
    sendProgress(id, 0);

    // 執行優化並傳遞真實進度
    const result = await executeOptimization(parts, materials, id);

    if (cancelled || currentRequestId !== id) {
      return;
    }

    // 發送最終進度
    sendProgress(id, 100);

    // 發送結果
    sendResult(id, result);
  } catch (error) {
    sendError(id, error instanceof Error ? error.message : '未知錯誤');
  } finally {
    if (currentRequestId === id) {
      currentRequestId = null;
    }
  }
}

/**
 * 執行優化計算
 */
async function executeOptimization(
  parts: PartWithQuantity[],
  materials: Material[],
  requestId: string
): Promise<PlacementResult> {
  if (!v6System) {
    throw new Error('系統未初始化');
  }

  console.log(`[Worker] 開始優化：${parts.length} 種零件, ${materials.length} 種材料`);
  
  try {
    // 使用優化系統執行計算，並傳遞進度回調
    const startTime = performance.now();
    const result = v6System.optimize(parts, materials, (progress) => {
      if (cancelled || currentRequestId !== requestId) return;
      sendProgress(requestId, progress.percentage);
      console.log(`[Worker] 進度更新: ${progress.stage} - ${progress.percentage}%`);
    });
    const endTime = performance.now();
    
    console.log(`[Worker] 優化完成，耗時：${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[Worker] 結果：已排版 ${result.placedParts.length} 個零件`);
    
    return result;
  } catch (error) {
    console.error('[Worker] 優化過程發生錯誤：', error);
    throw error;
  }
}

/**
 * 發送結果
 */
function sendResult(id: string, result: PlacementResult): void {
  const response: WorkerResponse = {
    type: 'result',
    id,
    result
  };
  ctx.postMessage(response);
}

/**
 * 發送錯誤
 */
function sendError(id: string, error: string): void {
  const response: WorkerResponse = {
    type: 'error',
    id,
    error
  };
  ctx.postMessage(response);
}

/**
 * 發送進度
 */
function sendProgress(id: string, progress: number): void {
  const response: WorkerResponse = {
    type: 'progress',
    id,
    progress
  };
  ctx.postMessage(response);
}

/**
 * 處理取消請求
 */
function handleCancel(): void {
  cancelled = true;
  currentRequestId = null;
}

/**
 * Worker 訊息處理器
 */
ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data } = event.data;

  switch (type) {
    case 'optimize':
      if (data) {
        await handleOptimize(id, data.parts, data.materials, data.angleTolerance);
      }
      break;

    case 'cancel':
      handleCancel();
      break;

    default:
      sendError(id, `未知的訊息類型: ${type}`);
  }
};

// 處理錯誤
ctx.onerror = (error: ErrorEvent) => {
  console.error('Worker 錯誤:', error);
  if (currentRequestId) {
    sendError(currentRequestId, `Worker 錯誤: ${error.message}`);
  }
};

// 導出空物件以符合 TypeScript 模組要求
export {};