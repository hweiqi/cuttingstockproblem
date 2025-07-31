import { PartWithQuantity } from '../models/Part';
import { Material, PlacementResult } from '../models/Material';
import { OptimizedFlexibleAngleMatcher } from '../matching/OptimizedFlexibleAngleMatcher';
import { OptimizedChainBuilder } from '../optimization/OptimizedChainBuilder';
import { OptimizedPlacerV4 } from '../../../placement/OptimizedPlacerV4';
import { OptimizationReportService } from '../../../services/OptimizationReportService';

/**
 * V6系統結果
 */
export interface V6SystemResult extends PlacementResult {
  optimization: {
    chainsBuilt: number;
    totalChainSavings: number;
    anglesToleranceUsed: number;
    mixedChainsCreated: number;
  };
  performance: {
    matchingTime: number;
    chainBuildingTime: number;
    placementTime: number;
    totalTime: number;
  };
}

/**
 * 進度回調函數類型
 */
export type ProgressCallback = (progress: {
  stage: string;
  percentage: number;
  details?: string;
}) => void;

/**
 * V6系統配置
 */
export interface V6SystemConfig {
  angleTolerance?: number;           // 角度容差（度）
  maxChainSize?: number;            // 最大鏈大小
  prioritizeMixedChains?: boolean;  // 優先混合鏈
  constraints?: {
    cuttingLoss?: number;
    frontEndLoss?: number;
    backEndLoss?: number;
  };
  onProgress?: ProgressCallback;     // 進度回調
}

/**
 * V6 完整切割優化系統
 * 
 * 特點：
 * 1. 靈活的角度匹配（支援容差和交叉匹配）
 * 2. 動態共刀鏈構建（支援混合零件）
 * 3. 優化排版邏輯以減少材料使用
 */
export class V6System {
  private matcher: OptimizedFlexibleAngleMatcher;
  private chainBuilder: OptimizedChainBuilder;
  private placer: OptimizedPlacerV4;
  private config: V6SystemConfig;
  private reportService: OptimizationReportService;

  constructor(config?: V6SystemConfig) {
    this.config = {
      angleTolerance: 5,
      maxChainSize: 50,
      prioritizeMixedChains: true,
      ...config
    };

    this.matcher = new OptimizedFlexibleAngleMatcher(this.config.angleTolerance);
    this.chainBuilder = new OptimizedChainBuilder(this.config.angleTolerance);
    
    // 使用優化排版器 V4
    this.placer = new OptimizedPlacerV4(this.config.constraints);
    this.reportService = new OptimizationReportService(this.config.angleTolerance);
  }

  /**
   * 執行完整的切割優化
   */
  optimize(parts: PartWithQuantity[], materials: Material[], onProgress?: ProgressCallback): V6SystemResult {
    const totalStartTime = Date.now();
    const progressCallback = onProgress || this.config.onProgress;
    
    // 步驟1：分析零件的共刀潛力
    progressCallback?.({ stage: '分析共刀潛力', percentage: 0, details: '開始分析...' });
    const matchingStartTime = Date.now();
    const sharedCuttingPotential = this.matcher.evaluateSharedCuttingPotential(
      parts.map(p => ({
        id: p.id,
        length: p.length,
        angles: p.angles,
        thickness: p.thickness
      })),
      progressCallback
    );
    const matchingTime = Date.now() - matchingStartTime;
    progressCallback?.({ stage: '分析共刀潛力', percentage: 33, details: `找到 ${sharedCuttingPotential.matches.length} 個潛在匹配` });
    
    // 步驟2：構建共刀鏈
    progressCallback?.({ stage: '構建共刀鏈', percentage: 35, details: '開始構建...' });
    const chainBuildingStartTime = Date.now();
    const chainResult = this.chainBuilder.buildChainsWithReport(parts, progressCallback);
    const chainBuildingTime = Date.now() - chainBuildingStartTime;
    progressCallback?.({ stage: '構建共刀鏈', percentage: 66, details: `構建了 ${chainResult.chains.length} 個共刀鏈` });
    
    // 步驟3：執行排版
    progressCallback?.({ stage: '執行排版', percentage: 70, details: '開始排版...' });
    const placementStartTime = Date.now();
    const placementResult = this.placer.placePartsWithChains(
      parts,
      materials,
      chainResult.chains
    );
    const placementTime = Date.now() - placementStartTime;
    progressCallback?.({ stage: '完成優化', percentage: 100, details: '優化完成！' });
    
    const totalTime = Date.now() - totalStartTime;
    
    // 統計混合鏈數量
    const mixedChainsCreated = chainResult.chains.filter(
      chain => chain.structure === 'mixed' || chain.structure === 'complex'
    ).length;
    
    // 構建最終結果
    const result: V6SystemResult = {
      ...placementResult,
      optimization: {
        chainsBuilt: chainResult.chains.length,
        totalChainSavings: chainResult.report.totalSavings,
        anglesToleranceUsed: this.config.angleTolerance!,
        mixedChainsCreated
      },
      performance: {
        matchingTime,
        chainBuildingTime,
        placementTime,
        totalTime
      }
    };
    
    // 添加額外的警告和建議
    if (sharedCuttingPotential.totalPotentialSavings > chainResult.report.totalSavings * 1.5) {
      result.warnings.push(
        `Potential for additional savings: ${sharedCuttingPotential.totalPotentialSavings.toFixed(2)}mm vs actual ${chainResult.report.totalSavings.toFixed(2)}mm`
      );
    }
    
    // 檢查是否有未排版零件需要自動擴展材料供應
    if (placementResult.unplacedParts.length > 0) {
      const hasLimitedMaterialsOnly = materials.every(m => m.quantity && m.quantity > 0);
      if (hasLimitedMaterialsOnly) {
        result.warnings.push(
          `系統檢測到有限材料可能不足，已自動擴展材料供應以完成所有零件的排版`
        );
      }
    }
    
    return result;
  }

  /**
   * 獲取系統配置
   */
  getConfig(): V6SystemConfig {
    return { ...this.config };
  }

  /**
   * 更新系統配置
   */
  updateConfig(config: Partial<V6SystemConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重新創建組件
    if (config.angleTolerance !== undefined) {
      this.matcher = new OptimizedFlexibleAngleMatcher(config.angleTolerance);
      this.chainBuilder = new OptimizedChainBuilder(config.angleTolerance);
      this.reportService = new OptimizationReportService(config.angleTolerance);
    }
    
    if (config.constraints !== undefined) {
      this.placer = new OptimizedPlacerV4(config.constraints);
    }
  }

  /**
   * 生成優化報告
   */
  generateOptimizationReport(result: V6SystemResult): string {
    return this.reportService.generateReport(result);
  }
}