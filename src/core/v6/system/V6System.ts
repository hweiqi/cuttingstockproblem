import { PartWithQuantity } from '../models/Part';
import { Material, PlacementResult } from '../models/Material';
import { FlexibleAngleMatcher } from '../matching/FlexibleAngleMatcher';
import { DynamicChainBuilder } from '../optimization/DynamicChainBuilder';
import { OptimizedPlacer } from '../../../placement/OptimizedPlacer';

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
  private matcher: FlexibleAngleMatcher;
  private chainBuilder: DynamicChainBuilder;
  private placer: OptimizedPlacer;
  private config: V6SystemConfig;

  constructor(config?: V6SystemConfig) {
    this.config = {
      angleTolerance: 5,
      maxChainSize: 50,
      prioritizeMixedChains: true,
      ...config
    };

    this.matcher = new FlexibleAngleMatcher(this.config.angleTolerance);
    this.chainBuilder = new DynamicChainBuilder(this.config.angleTolerance);
    
    // 使用優化排版器
    this.placer = new OptimizedPlacer(this.config.constraints);
  }

  /**
   * 執行完整的切割優化
   */
  optimize(parts: PartWithQuantity[], materials: Material[]): V6SystemResult {
    const totalStartTime = performance.now();
    
    // 步驟1：分析零件的共刀潛力
    const matchingStartTime = performance.now();
    const sharedCuttingPotential = this.matcher.evaluateSharedCuttingPotential(
      parts.map(p => ({
        id: p.id,
        length: p.length,
        angles: p.angles,
        thickness: p.thickness
      }))
    );
    const matchingTime = performance.now() - matchingStartTime;
    
    // 步驟2：構建共刀鏈
    const chainBuildingStartTime = performance.now();
    const chainResult = this.chainBuilder.buildChainsWithReport(parts);
    const chainBuildingTime = performance.now() - chainBuildingStartTime;
    
    // 步驟3：執行排版
    const placementStartTime = performance.now();
    const placementResult = this.placer.placePartsWithChains(
      parts,
      materials,
      chainResult.chains
    );
    const placementTime = performance.now() - placementStartTime;
    
    const totalTime = performance.now() - totalStartTime;
    
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
      this.matcher = new FlexibleAngleMatcher(config.angleTolerance);
      this.chainBuilder = new DynamicChainBuilder(config.angleTolerance);
    }
    
    if (config.constraints !== undefined) {
      this.placer = new OptimizedPlacer(config.constraints);
    }
  }

  /**
   * 生成優化報告
   */
  generateOptimizationReport(result: V6SystemResult): string {
    const report = [];
    
    report.push('=== V6 切割優化系統報告 ===\n');
    
    report.push('輸入摘要:');
    report.push(`  總零件數: ${result.report.totalParts}`);
    report.push(`  總材料數: ${result.report.totalMaterials}`);
    report.push('');
    
    report.push('優化結果:');
    report.push(`  共刀鏈數: ${result.optimization.chainsBuilt}`);
    report.push(`  混合鏈數: ${result.optimization.mixedChainsCreated}`);
    report.push(`  總節省: ${result.optimization.totalChainSavings.toFixed(2)}mm`);
    report.push(`  角度容差: ±${result.optimization.anglesToleranceUsed}°`);
    report.push('');
    
    report.push('排版結果:');
    report.push(`  已排版零件: ${result.placedParts.length}`);
    report.push(`  未排版零件: ${result.unplacedParts.length}`);
    report.push(`  材料利用率: ${(result.report.materialUtilization * 100).toFixed(2)}%`);
    report.push(`  使用材料數: ${result.usedMaterials.length}`);
    report.push('');
    
    report.push('性能指標:');
    report.push(`  匹配時間: ${result.performance.matchingTime.toFixed(2)}ms`);
    report.push(`  鏈構建時間: ${result.performance.chainBuildingTime.toFixed(2)}ms`);
    report.push(`  排版時間: ${result.performance.placementTime.toFixed(2)}ms`);
    report.push(`  總時間: ${result.performance.totalTime.toFixed(2)}ms`);
    
    if (result.warnings.length > 0) {
      report.push('\n警告:');
      result.warnings.forEach(warning => {
        report.push(`  - ${warning}`);
      });
    }
    
    return report.join('\n');
  }
}