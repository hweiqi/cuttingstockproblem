import { V6SystemResult } from '../core/v6/system/V6System';

/**
 * 統一的優化報告服務
 * 負責生成和格式化優化報告，避免重複代碼
 */
export class OptimizationReportService {
  private angleTolerance: number;

  constructor(angleTolerance: number = 5) {
    this.angleTolerance = angleTolerance;
  }

  /**
   * 生成完整的優化報告
   */
  generateReport(result: V6SystemResult): string {
    const report: string[] = [];
    
    report.push('=== V6 切割優化系統報告 ===\n');
    
    // 輸入摘要
    this.addInputSummary(report, result);
    
    // 優化結果
    this.addOptimizationResults(report, result);
    
    // 排版結果
    this.addPlacementResults(report, result);
    
    // 未排版零件分析
    if (result.unplacedParts.length > 0) {
      this.addUnplacedPartsAnalysis(report, result);
    }
    
    // 警告
    if (result.warnings && result.warnings.length > 0) {
      this.addWarnings(report, result.warnings);
    }
    
    return report.join('\n');
  }

  /**
   * 格式化 Worker 結果
   */
  formatForWorker(workerResult: any): string {
    // 將 Worker 結果轉換為 V6SystemResult 格式
    const v6Result: V6SystemResult = {
      placedParts: workerResult.placedParts || [],
      unplacedParts: workerResult.unplacedParts || [],
      usedMaterials: workerResult.usedMaterials || [],
      warnings: workerResult.warnings || [],
      totalSavings: workerResult.totalSavings || workerResult.optimization?.totalChainSavings || 0,
      report: workerResult.report || {
        totalParts: 0,
        totalMaterials: 0,
        materialUtilization: 0,
        processingTime: 0
      },
      optimization: workerResult.optimization || {
        chainsBuilt: 0,
        totalChainSavings: 0,
        anglesToleranceUsed: this.angleTolerance,
        mixedChainsCreated: 0
      },
      performance: workerResult.performance || {
        matchingTime: 0,
        chainBuildingTime: 0,
        placementTime: 0,
        totalTime: 0
      }
    };
    
    return this.generateReport(v6Result);
  }

  private addInputSummary(report: string[], result: V6SystemResult): void {
    report.push('輸入摘要:');
    report.push(`  總零件數: ${result.report.totalParts}`);
    report.push('');
  }

  private addOptimizationResults(report: string[], result: V6SystemResult): void {
    report.push('優化摘要:');
    report.push(`  共刀鏈數: ${result.optimization.chainsBuilt}`);
    report.push(`  混合鏈數: ${result.optimization.mixedChainsCreated}`);
    report.push(`  總節省: ${result.optimization.totalChainSavings.toFixed(2)}mm`);
    report.push(`  角度容差: ±${result.optimization.anglesToleranceUsed || this.angleTolerance}°`);
    
    // 整合效能指標到優化摘要
    report.push(`  匹配時間: ${result.performance.matchingTime.toFixed(2)}ms`);
    report.push(`  鏈構建時間: ${result.performance.chainBuildingTime.toFixed(2)}ms`);
    report.push(`  排版時間: ${result.performance.placementTime.toFixed(2)}ms`);
    report.push(`  總處理時間: ${result.performance.totalTime.toFixed(2)}ms`);
    report.push('');
  }

  private addPlacementResults(report: string[], result: V6SystemResult): void {
    report.push('排版結果:');
    report.push(`  已排版零件: ${result.placedParts.length}`);
    report.push(`  未排版零件: ${result.unplacedParts.length}`);
    report.push(`  材料利用率: ${(result.report.materialUtilization * 100).toFixed(2)}%`);
    report.push(`  使用材料數: ${result.usedMaterials.length}`);
    report.push('');
  }

  private addUnplacedPartsAnalysis(report: string[], result: V6SystemResult): void {
    report.push('未排版零件分析:');
    
    // 統計各原因的數量
    const reasonCounts = new Map<string, number>();
    const reasonParts = new Map<string, string[]>();
    
    result.unplacedParts.forEach(unplaced => {
      const reason = unplaced.reason;
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      
      if (!reasonParts.has(reason)) {
        reasonParts.set(reason, []);
      }
      reasonParts.get(reason)!.push(`${unplaced.partId}#${unplaced.instanceId}`);
    });
    
    // 按數量排序原因
    const sortedReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sortedReasons.forEach(([reason, count]) => {
      report.push(`  ■ ${reason}`);
      report.push(`    數量: ${count} 個零件`);
      
      // 顯示前5個零件ID作為範例
      const parts = reasonParts.get(reason) || [];
      const examples = parts.slice(0, 5);
      if (examples.length > 0) {
        report.push(`    範例: ${examples.join(', ')}${parts.length > 5 ? ` 等${parts.length}個` : ''}`);
      }
      report.push('');
    });
    
    // 提供建議
    report.push('建議解決方案:');
    this.addSuggestionsForUnplacedParts(report, sortedReasons);
    report.push('');
  }

  private addSuggestionsForUnplacedParts(report: string[], sortedReasons: Array<[string, number]>): void {
    for (const [reason] of sortedReasons) {
      if (reason.includes('超出最大材料長度')) {
        report.push('  - 考慮提供更長的材料或將大零件分割成較小的部分');
      } else if (reason.includes('前端損耗')) {
        report.push('  - 考慮減少前端損耗設定或使用更長的材料');
      } else if (reason.includes('有限數量的材料已用完')) {
        report.push('  - 增加材料數量或使用無限供應的材料');
      } else if (reason.includes('材料實例創建或分配失敗')) {
        report.push('  - 可能需要調整批次大小或優化演算法參數');
      } else if (reason.includes('材料碎片化')) {
        report.push('  - 考慮使用更好的排版策略或重新排列零件順序');
      }
    }
  }


  private addWarnings(report: string[], warnings: string[]): void {
    report.push('\n警告:');
    warnings.forEach(warning => {
      report.push(`  - ${warning}`);
    });
  }
}