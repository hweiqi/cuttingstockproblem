import React, { useState, useCallback, useEffect } from 'react';
import { MaterialService } from '../services/MaterialService';
import { PartService } from '../services/PartService';
import { V6CuttingService } from '../services/V6CuttingService';
import { CuttingOptimizationWorkerClient } from '../workers/CuttingOptimizationWorkerClient';
import { MaterialInput } from './MaterialInput';
import { PartInput } from './PartInput';
import { CuttingResult } from './CuttingResult';
import { TestScenarioSelector } from './TestScenarioSelector';
import { OptimizationProgress, PerformanceMetrics } from './ProgressIndicator';
import { Material, Part, PartAngles, CuttingResult as CuttingResultType } from '../types';

/**
 * 優化版切割優化應用
 * 支援 Web Worker 和進度顯示
 */
export const OptimizedCuttingStockApp: React.FC = () => {
  const [materialService] = useState(() => new MaterialService());
  const [partService] = useState(() => new PartService());
  const [v6CuttingService] = useState(() => new V6CuttingService());
  const [workerClient, setWorkerClient] = useState<CuttingOptimizationWorkerClient | null>(null);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [cuttingLoss, setCuttingLoss] = useState(3);
  const [frontCuttingLoss, setFrontCuttingLoss] = useState(10);
  const [result, setResult] = useState<CuttingResultType | null>(null);
  const [error, setError] = useState('');
  
  // 優化狀態
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationStage, setOptimizationStage] = useState('');
  const [useWebWorker, setUseWebWorker] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);

  // 初始化 Web Worker
  useEffect(() => {
    if (useWebWorker && CuttingOptimizationWorkerClient.isSupported()) {
      const client = new CuttingOptimizationWorkerClient();
      setWorkerClient(client);
      
      return () => {
        client.terminate();
      };
    }
  }, [useWebWorker]);

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

  const handleClearAll = () => {
    if (window.confirm('確定要清除所有資料嗎？')) {
      materialService.clearAllMaterials();
      partService.clearAllParts();
      setMaterials([]);
      setParts([]);
      setResult(null);
      setError('');
    }
  };

  const handleOptimize = useCallback(async () => {
    console.log('[App] 開始優化，材料數：', materials.length, '零件數：', parts.length);
    
    if (materials.length === 0) {
      setError('請至少新增一個母材');
      return;
    }

    if (parts.length === 0) {
      setError('請至少新增一個零件');
      return;
    }

    setError('');
    setIsOptimizing(true);
    setOptimizationProgress(0);
    setOptimizationStage('初始化...');

    const startTime = performance.now();

    try {
      let optimizationResult;

      if (useWebWorker && workerClient) {
        console.log('[App] 使用 Web Worker 優化');
        // 使用 Web Worker
        const workerResult = await workerClient.optimize(
          parts.map(p => ({
            id: p.id,
            length: p.length,
            quantity: p.quantity,
            angles: p.angles || { topLeft: 90, topRight: 90, bottomLeft: 90, bottomRight: 90 },
            thickness: 20
          })),
          materials.map(m => ({
            id: m.id,
            length: m.length,
            quantity: m.quantity || 1,
            type: 'standard'
          })),
          {
            onProgress: (progress) => {
              setOptimizationProgress(progress);
              
              // 更新階段訊息
              if (progress < 30) setOptimizationStage('分析零件共刀潛力...');
              else if (progress < 60) setOptimizationStage('構建共刀鏈...');
              else if (progress < 90) setOptimizationStage('執行排版優化...');
              else setOptimizationStage('完成最終優化...');
            }
          }
        );
        
        // 將 Web Worker 結果轉換為應用格式
        optimizationResult = v6CuttingService.convertWorkerResult(workerResult, materials, parts, cuttingLoss, frontCuttingLoss);
      } else {
        console.log('[App] 使用同步方法優化');
        // 使用同步方法
        optimizationResult = v6CuttingService.optimize(
          materials,
          parts,
          cuttingLoss,
          frontCuttingLoss
        );
      }
      
      console.log('[App] 優化完成，結果：', optimizationResult);

      const endTime = performance.now();
      
      setResult({
        ...optimizationResult,
        processingTime: endTime - startTime
      } as CuttingResultType);
      
      setOptimizationProgress(100);
      setShowMetrics(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '優化過程中發生錯誤');
    } finally {
      setIsOptimizing(false);
    }
  }, [materials, parts, cuttingLoss, frontCuttingLoss, v6CuttingService, useWebWorker, workerClient]);

  const handleCancelOptimization = useCallback(() => {
    if (workerClient) {
      workerClient.cancel();
    }
    setIsOptimizing(false);
    setOptimizationProgress(0);
  }, [workerClient]);

  const handleLoadTestScenario = (testMaterials: Material[], testParts: Part[]) => {
    materialService.clearAllMaterials();
    partService.clearAllParts();
    
    testMaterials.forEach(m => {
      materialService.addMaterial(m.length, m.quantity);
    });
    
    testParts.forEach(p => {
      partService.addPart(p.length, p.quantity, p.angles);
    });
    
    setMaterials([...testMaterials]);
    setParts([...testParts]);
    setResult(null);
    setError('');
  };

  const totalParts = parts.reduce((sum, part) => sum + part.quantity, 0);
  const totalMaterials = materials.reduce((sum, material) => sum + (material.quantity || 1), 0);

  return (
    <div className="cutting-stock-app">
      <h1>切割優化系統 - 高效能版</h1>
      
      <div className="optimization-settings">
        <label>
          <input
            type="checkbox"
            checked={useWebWorker}
            onChange={(e) => setUseWebWorker(e.target.checked)}
            disabled={!CuttingOptimizationWorkerClient.isSupported()}
          />
          使用 Web Worker（後台計算）
        </label>
        {!CuttingOptimizationWorkerClient.isSupported() && (
          <span className="warning">（您的瀏覽器不支援 Web Worker）</span>
        )}
      </div>

      <TestScenarioSelector onApplyScenario={(testParts: Part[], testMaterials?: Material[]) => {
        // 清除現有資料
        materialService.clearAllMaterials();
        partService.clearAllParts();
        setMaterials([]);
        setParts([]);
        
        // 載入測試材料（如果有提供）
        if (testMaterials && testMaterials.length > 0) {
          testMaterials.forEach(m => {
            materialService.addMaterial(m.length, m.quantity);
          });
          setMaterials([...testMaterials]);
        }
        
        // 載入測試零件
        testParts.forEach(p => {
          partService.addPart(p.length, p.quantity, p.angles);
        });
        
        setParts([...testParts]);
        setResult(null);
        setError('');
      }} />
      
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
      </div>
      
      <div className="loss-settings">
        <div>
          <label htmlFor="cuttingLoss">每切割刀損耗 (mm):</label>
          <input
            id="cuttingLoss"
            type="number"
            value={cuttingLoss}
            onChange={(e) => setCuttingLoss(Number(e.target.value))}
            min="0"
            max="50"
          />
        </div>
        <div>
          <label htmlFor="frontCuttingLoss">前端切割損耗 (mm):</label>
          <input
            id="frontCuttingLoss"
            type="number"
            value={frontCuttingLoss}
            onChange={(e) => setFrontCuttingLoss(Number(e.target.value))}
            min="0"
            max="100"
          />
        </div>
      </div>
      
      <div className="action-buttons">
        <button 
          onClick={handleOptimize} 
          disabled={materials.length === 0 || parts.length === 0 || isOptimizing}
        >
          {isOptimizing ? '優化中...' : '開始優化'}
        </button>
        <button onClick={handleClearAll} disabled={isOptimizing}>清除所有資料</button>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div className="summary">
        <p>總母材數量: {totalMaterials}</p>
        <p>總零件數量: {totalParts}</p>
      </div>
      
      {result && (
        <>
          <CuttingResult result={result} cuttingLoss={cuttingLoss} />
          {showMetrics && (
            <PerformanceMetrics
              metrics={{
                totalParts,
                processingTime: result.processingTime || 0,
                materialUtilization: result.materialUtilization || 0,
                optimizationMethod: useWebWorker ? 'Web Worker 優化' : '同步優化'
              }}
            />
          )}
        </>
      )}
      
      <OptimizationProgress
        isOptimizing={isOptimizing}
        progress={optimizationProgress}
        stage={optimizationStage}
        onCancel={handleCancelOptimization}
      />

      <style jsx>{`
        .cutting-stock-app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .optimization-settings {
          margin-bottom: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .optimization-settings label {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .warning {
          color: #ff9800;
          font-size: 14px;
          margin-left: 10px;
        }
        
        .input-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .loss-settings {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 5px;
        }
        
        .loss-settings div {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .loss-settings label {
          font-weight: 500;
        }
        
        .loss-settings input {
          width: 80px;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .action-buttons button {
          padding: 10px 20px;
          font-size: 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .action-buttons button:first-child {
          background-color: #4CAF50;
          color: white;
        }
        
        .action-buttons button:first-child:hover:not(:disabled) {
          background-color: #45a049;
        }
        
        .action-buttons button:last-child {
          background-color: #f44336;
          color: white;
        }
        
        .action-buttons button:last-child:hover:not(:disabled) {
          background-color: #da190b;
        }
        
        .action-buttons button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .error {
          background-color: #ffebee;
          color: #c62828;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .summary {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .summary p {
          margin: 5px 0;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .input-section {
            grid-template-columns: 1fr;
          }
          
          .loss-settings {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};