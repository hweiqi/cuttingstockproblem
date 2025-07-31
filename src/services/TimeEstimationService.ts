/**
 * 時間估算服務
 * 用於預估切割優化計算所需的時間
 */
export class TimeEstimationService {
  // 歷史執行數據（用於改進預估準確度）
  private executionHistory: Array<{
    partCount: number;
    angledPartCount: number;
    materialCount: number;
    executionTime: number;
    timestamp: number;
  }> = [];

  private readonly MAX_HISTORY = 20;
  
  constructor() {
    // 初始化時載入歷史記錄
    this.loadHistory();
  }

  /**
   * 預估計算時間（毫秒）
   */
  estimateExecutionTime(
    partCount: number,
    angledPartCount: number,
    materialCount: number
  ): number {
    // 更實際的基本公式：基於實際觀察調整
    // 10000個零件約30秒 = 30000ms，平均每個零件約3ms
    const baseTime = 300; // 基礎時間 300ms（初始化等固定開銷）
    
    // 零件複雜度：每個零件約 2-3ms
    const partComplexity = partCount * 2.5;
    
    // 共刀分析複雜度：這是最耗時的部分
    // 對於小量零件（<50），使用 O(n²) 的估算
    // 對於大量零件，由於有優化策略，使用較低的複雜度
    let sharedCutComplexity = 0;
    if (angledPartCount > 0) {
      if (angledPartCount < 50) {
        // 小量零件：接近 O(n²) 但係數很小
        sharedCutComplexity = angledPartCount * angledPartCount * 0.1;
      } else if (angledPartCount < 500) {
        // 中量零件：O(n * log(n)) * 係數
        sharedCutComplexity = angledPartCount * Math.log2(angledPartCount) * 5;
      } else {
        // 大量零件：有抽樣優化（上限500），增長很慢
        sharedCutComplexity = 500 * Math.log2(500) * 5 + (angledPartCount - 500) * 0.5;
      }
    }
    
    // 材料影響（較小）
    const materialFactor = materialCount * 5;
    
    // 排版複雜度（取決於零件總數和材料數）
    const placementComplexity = Math.sqrt(partCount) * materialCount * 2;
    
    // 基礎預估時間
    let estimatedTime = baseTime + partComplexity + sharedCutComplexity + materialFactor + placementComplexity;
    
    // 如果有歷史數據，使用加權平均進行調整
    if (this.executionHistory.length > 0) {
      const similarExecutions = this.findSimilarExecutions(partCount, angledPartCount);
      if (similarExecutions.length > 0) {
        // 按時間戳排序，最近的權重更高
        const sortedExecutions = similarExecutions.sort((a, b) => b.timestamp - a.timestamp);
        
        // 計算加權平均，最近的執行權重更高
        let weightedSum = 0;
        let totalWeight = 0;
        sortedExecutions.forEach((exec, index) => {
          const weight = 1 / (index + 1); // 權重遞減
          weightedSum += exec.executionTime * weight;
          totalWeight += weight;
        });
        
        const avgHistoricalTime = weightedSum / totalWeight;
        
        // 如果有足夠的歷史數據，更信任歷史數據
        if (similarExecutions.length >= 3) {
          // 使用 85% 歷史數據 + 15% 公式計算
          estimatedTime = avgHistoricalTime * 0.85 + estimatedTime * 0.15;
        } else {
          // 歷史數據較少，使用 60% 歷史數據 + 40% 公式計算
          estimatedTime = avgHistoricalTime * 0.6 + estimatedTime * 0.4;
        }
      }
    }
    
    // 不添加緩衝，直接返回預估值
    return Math.round(estimatedTime);
  }

  /**
   * 記錄實際執行時間
   */
  recordExecution(
    partCount: number,
    angledPartCount: number,
    materialCount: number,
    executionTime: number
  ): void {
    this.executionHistory.push({
      partCount,
      angledPartCount,
      materialCount,
      executionTime,
      timestamp: Date.now()
    });
    
    // 保持歷史記錄在限制內
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory.shift();
    }
    
    // 存儲到 localStorage
    this.saveHistory();
  }

  /**
   * 查找相似的歷史執行記錄
   */
  private findSimilarExecutions(partCount: number, angledPartCount: number): typeof this.executionHistory {
    return this.executionHistory.filter(exec => {
      const partDiff = Math.abs(exec.partCount - partCount) / Math.max(exec.partCount, partCount, 1);
      const angledDiff = Math.abs(exec.angledPartCount - angledPartCount) / Math.max(exec.angledPartCount, angledPartCount, 1);
      // 如果零件數和斜切零件數的差異都在 40% 以內，認為是相似的（放寬標準以獲得更多參考數據）
      return partDiff < 0.4 && angledDiff < 0.4;
    });
  }

  /**
   * 從 localStorage 載入歷史記錄
   */
  loadHistory(): void {
    try {
      const stored = localStorage.getItem('cutting-optimization-history');
      if (stored) {
        this.executionHistory = JSON.parse(stored);
        // 清理超過7天的記錄
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this.executionHistory = this.executionHistory.filter(exec => exec.timestamp > sevenDaysAgo);
      }
    } catch (error) {
      console.error('Failed to load execution history:', error);
    }
  }

  /**
   * 保存歷史記錄到 localStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('cutting-optimization-history', JSON.stringify(this.executionHistory));
    } catch (error) {
      console.error('Failed to save execution history:', error);
    }
  }

  /**
   * 格式化時間顯示
   */
  formatTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}秒`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.round((milliseconds % 60000) / 1000);
      return `${minutes}分${seconds}秒`;
    }
  }
}

// 單例實例
export const timeEstimationService = new TimeEstimationService();

// 預設的歷史數據（基於您提供的實際測試：10000個約30秒）
const defaultHistory = [
  { partCount: 10, angledPartCount: 5, materialCount: 3, executionTime: 300, timestamp: Date.now() - 1000 },
  { partCount: 20, angledPartCount: 10, materialCount: 3, executionTime: 400, timestamp: Date.now() - 2000 },
  { partCount: 50, angledPartCount: 25, materialCount: 5, executionTime: 600, timestamp: Date.now() - 3000 },
  { partCount: 100, angledPartCount: 50, materialCount: 5, executionTime: 1000, timestamp: Date.now() - 4000 },
  { partCount: 500, angledPartCount: 250, materialCount: 10, executionTime: 3000, timestamp: Date.now() - 5000 },
  { partCount: 1000, angledPartCount: 500, materialCount: 10, executionTime: 5000, timestamp: Date.now() - 6000 },
  { partCount: 5000, angledPartCount: 2500, materialCount: 20, executionTime: 15000, timestamp: Date.now() - 7000 },
  { partCount: 10000, angledPartCount: 5000, materialCount: 30, executionTime: 30000, timestamp: Date.now() - 8000 }
];

// 如果沒有歷史記錄，使用預設值
if (timeEstimationService['executionHistory'].length === 0) {
  timeEstimationService['executionHistory'] = defaultHistory;
}