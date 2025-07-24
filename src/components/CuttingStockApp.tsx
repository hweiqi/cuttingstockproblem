import React, { useState } from 'react';
import { MaterialService } from '../services/MaterialService';
import { PartService } from '../services/PartService';
import { V6CuttingService } from '../services/V6CuttingService';
import { STANDARD_MATERIAL_LENGTHS } from '../config/MaterialConfig';
import { MaterialInput } from './MaterialInput';
import { PartInput } from './PartInput';
import { CuttingResult } from './CuttingResult';
import { TestScenarioSelector } from './TestScenarioSelector';
import { Material, Part, PartAngles, CuttingResult as CuttingResultType } from '../types';

export const CuttingStockApp: React.FC = () => {
  const [materialService] = useState(() => new MaterialService());
  const [partService] = useState(() => new PartService());
  const [v6CuttingService] = useState(() => new V6CuttingService());
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [cuttingLoss, setCuttingLoss] = useState(3);
  const [frontCuttingLoss, setFrontCuttingLoss] = useState(10);
  const [result, setResult] = useState<CuttingResultType | null>(null);
  const [error, setError] = useState('');

  const handleAddMaterial = (length: number) => {
    try {
      const material = materialService.addMaterial(length);
      setMaterials([...materials, material]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增母材時發生錯誤');
    }
  };

  const handleRemoveMaterial = (id: string) => {
    materialService.removeMaterial(id);
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleAddPart = (length: number, quantity: number, angles?: PartAngles) => {
    try {
      const part = partService.addPart(length, quantity, angles);
      setParts([...parts, part]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增零件時發生錯誤');
    }
  };

  const handleRemovePart = (id: string) => {
    partService.removePart(id);
    setParts(parts.filter(p => p.id !== id));
  };

  const handleOptimize = () => {
    if (materials.length === 0) {
      setError('請先設定母材');
      return;
    }
    
    if (parts.length === 0) {
      setError('請先設定零件');
      return;
    }

    try {
      const startTime = Date.now();
      // 更新切割損耗配置
      v6CuttingService.updateConstraints(cuttingLoss, frontCuttingLoss);
      // 使用V6系統進行優化
      const cutPlans = v6CuttingService.optimizeCutting(materials, parts);
      
      // 計算總體統計
      const totalParts = parts.reduce((sum, p) => sum + (p.quantity || 1), 0);
      const placedParts = cutPlans.reduce((sum, plan) => sum + (plan.cuts?.length || 0), 0);
      const totalWaste = cutPlans.reduce((sum, plan) => sum + (plan.waste || 0), 0);
      const totalMaterialUsed = cutPlans.reduce((sum, plan) => sum + plan.materialLength, 0);
      const averageUtilization = totalMaterialUsed > 0 
        ? (totalMaterialUsed - totalWaste) / totalMaterialUsed 
        : 0;
      
      // 計算共刀統計
      const sharedCuts = cutPlans.reduce((sum, plan) => 
        sum + (plan.cuts?.filter(cut => cut.isSharedCut).length || 0), 0
      );
      
      const optimizationResult: CuttingResultType = {
        cutPlans,
        totalMaterialsUsed: cutPlans.length,
        totalWaste,
        overallEfficiency: averageUtilization * 100,
        executionTime: Date.now() - startTime,
        unplacedParts: [],
        totalParts,
        placedParts,
        averageUtilization,
        report: v6CuttingService.getOptimizationReport(materials, parts),
        warnings: [],
        sharedCuttingInfo: {
          totalSharedCuts: sharedCuts,
          totalSavings: 0 // V6系統會在報告中提供詳細節省資訊
        }
      };
      
      // 檢查是否有虛擬材料
      const virtualPlans = cutPlans.filter(plan => plan.isVirtual);
      if (virtualPlans.length > 0) {
        optimizationResult.warnings?.push(
          `系統創建了 ${virtualPlans.length} 個虛擬材料以確保所有零件都被排版`
        );
      }
      
      setResult(optimizationResult);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '排版計算時發生錯誤');
    }
  };

  const handleClearAll = () => {
    materialService.clearAllMaterials();
    partService.clearAllParts();
    setMaterials([]);
    setParts([]);
    setResult(null);
    setError('');
  };

  const handleApplyTestScenario = (testMaterials: Material[], testParts: Part[]) => {
    try {
      // 清除現有數據
      materialService.clearAllMaterials();
      partService.clearAllParts();
      
      // 加入測試數據
      const newMaterials: Material[] = [];
      const newParts: Part[] = [];
      
      testMaterials.forEach(material => {
        const added = materialService.addMaterial(material.length);
        newMaterials.push(added);
      });
      
      testParts.forEach(part => {
        const added = partService.addPart(part.length, part.quantity, part.angles);
        newParts.push(added);
      });
      
      setMaterials(newMaterials);
      setParts(newParts);
      setResult(null);
      setError('測試場景已載入');
      
      // 3秒後清除提示訊息
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入測試場景時發生錯誤');
    }
  };

  return (
    <div className="cutting-stock-app">
      <h1>鋼構排版系統 (V6 優化引擎)</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="app-content">
        <div className="input-section">
          <MaterialInput
            materials={materials}
            onAddMaterial={handleAddMaterial}
            onRemoveMaterial={handleRemoveMaterial}
          />
          
          <PartInput
            parts={parts}
            onAddPart={handleAddPart}
            onRemovePart={handleRemovePart}
          />
          
          <div className="settings">
            <h3>設定</h3>
            <div className="setting-info">
              <p>V6系統使用智能共刀優化，自動處理：</p>
              <ul>
                <li>✓ 不同位置的角度匹配</li>
                <li>✓ 角度容差 (±5°)</li>
                <li>✓ 混合零件共刀鏈</li>
                <li>✓ 確保所有零件排版</li>
              </ul>
            </div>
            <div className="setting-item">
              <label>切割損耗 (mm):</label>
              <input
                type="number"
                value={cuttingLoss}
                onChange={(e) => setCuttingLoss(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max="50"
                className="input input-sm"
              />
              <small>（零件間的切割損耗）</small>
            </div>
            <div className="setting-item">
              <label>前端切割損耗 (mm):</label>
              <input
                type="number"
                value={frontCuttingLoss}
                onChange={(e) => setFrontCuttingLoss(Math.max(0, parseInt(e.target.value) || 0))}
                min="0"
                max="100"
                className="input input-sm"
              />
              <small>（材料前端的預留空間）</small>
            </div>
            <div className="setting-note">
              <small>註：後端切割損耗固定為 10mm</small>
            </div>
          </div>
          
          <div className="actions">
            <button onClick={handleOptimize} className="btn btn-primary">
              開始排版計算
            </button>
            <button onClick={handleClearAll} className="btn btn-secondary">
              清除全部
            </button>
            <TestScenarioSelector onApplyScenario={handleApplyTestScenario} />
          </div>
        </div>
        
        {result && (
          <div className="result-section">
            <CuttingResult result={result} cuttingLoss={cuttingLoss} />
          </div>
        )}
      </div>
    </div>
  );
};