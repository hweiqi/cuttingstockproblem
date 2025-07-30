# 排版計算效能瓶頸分析

基於程式碼分析，以下是主要的效能瓶頸：

## 1. 共刀匹配計算複雜度高

- **問題**：`evaluateSharedCuttingPotential` 需要比對所有零件組合，時間複雜度 O(n²)
- **影響**：10000 個零件需要進行 5000 萬次比對
- **建議**：
  - 實作空間索引（如 R-tree）快速篩選相似長度的零件
  - 使用哈希表預先分組相同角度的零件
  - 實作早期終止策略，當找到足夠好的匹配時停止搜尋

## 2. 動態鏈構建的記憶體消耗

- **問題**：`DynamicChainBuilder` 需要保存所有可能的鏈組合
- **影響**：大量零件時會產生指數級的組合數
- **建議**：
  - 限制鏈的最大長度（目前是 50，可動態調整）
  - 使用貪心算法優先構建高收益的鏈
  - 實作增量式構建，避免一次性計算所有組合

## 3. 排版算法的重複計算

- **問題**：`OptimizedPlacerV2` 可能會多次嘗試相同的排版組合
- **影響**：浪費 CPU 時間在已經失敗的組合上
- **建議**：
  - 實作記憶化（memoization）快取已嘗試的組合
  - 使用分支限界法提前剪枝不可能的解
  - 採用並行計算處理不同的材料實例

## 4. 效能改善實作建議

### 短期優化（立即可實作）

1. **批次處理**：將 10000 個零件分批處理，每批 1000-2000 個
2. **Web Worker**：將計算移至後台執行緒，避免阻塞 UI
3. **進度回饋**：提供即時進度條，改善使用者體驗

### 中期優化（需要架構調整）

1. **分散式計算**：將計算分散到多個 Worker 或伺服器
2. **快取機制**：儲存常用零件組合的最佳解
3. **啟發式算法**：使用遺傳算法或模擬退火優化搜尋

### 長期優化（需要算法創新）

1. **機器學習**：訓練模型預測最佳排版方案
2. **量子啟發算法**：使用量子退火概念改善搜尋
3. **GPU 加速**：利用 WebGL 進行平行計算

## 5. 具體實作範例

```typescript
// Web Worker 實作範例
class OptimizationWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];

  async optimizeBatch(parts: Part[], batchSize = 1000) {
    const batches = this.splitIntoBatches(parts, batchSize);
    const results = await Promise.all(
      batches.map(batch => this.processInWorker(batch))
    );
    return this.mergeBatchResults(results);
  }
}
```

這些改善能顯著提升 10000+ 零件的處理效能，從目前可能需要數分鐘降至數秒內完成。
