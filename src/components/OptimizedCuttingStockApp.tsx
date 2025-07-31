import React, { useState, useCallback, useEffect } from 'react';
import { MaterialService } from '../services/MaterialService';
import { PartService } from '../services/PartService';
import { V6CuttingService } from '../services/V6CuttingService';
import { CuttingOptimizationWorkerClient } from '../workers/CuttingOptimizationWorkerClient';
import { MaterialInput } from './MaterialInput';
import { PartInput } from './PartInput';
import { CuttingResult } from './CuttingResult';
import { TestScenarioSelector } from './TestScenarioSelector';
import { OptimizationProgress } from './ProgressIndicator';
import { Material, Part, PartAngles, CuttingResult as CuttingResultType } from '../types';
import { timeEstimationService } from '../services/TimeEstimationService';

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
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [useWebWorker, setUseWebWorker] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'parts'>('materials');

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
    setElapsedTime(0);

    // 計算有斜切角度的零件數
    const angledPartCount = parts.filter(p => 
      p.angles && Object.values(p.angles).some(angle => angle > 0 && angle < 90)
    ).reduce((sum, p) => sum + p.quantity, 0);
    
    const totalPartCount = parts.reduce((sum, p) => sum + p.quantity, 0);
    
    // 預估時間
    const estimated = timeEstimationService.estimateExecutionTime(
      totalPartCount,
      angledPartCount,
      materials.length
    );
    setEstimatedTime(estimated);

    const startTime = performance.now();
    
    // 更新經過時間
    let timeInterval: NodeJS.Timeout | null = null;
    timeInterval = setInterval(() => {
      setElapsedTime(performance.now() - startTime);
    }, 100);

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
          frontCuttingLoss,
          (progress) => {
            setOptimizationProgress(progress.percentage);
            setOptimizationStage(progress.stage);
          }
        );
      }
      
      console.log('[App] 優化完成，結果：', optimizationResult);

      const endTime = performance.now();
      const executionTime = Math.round(endTime - startTime);
      if (timeInterval) clearInterval(timeInterval);
      
      // 記錄實際執行時間
      timeEstimationService.recordExecution(
        totalPartCount,
        angledPartCount,
        materials.length,
        executionTime
      );
      
      setResult({
        ...optimizationResult,
        processingTime: executionTime
      } as CuttingResultType);
      
      setOptimizationProgress(100);
    } catch (err) {
      if (timeInterval) clearInterval(timeInterval);
      setError(err instanceof Error ? err.message : '優化過程中發生錯誤');
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress(0);
      setOptimizationStage('');
      setEstimatedTime(0);
      setElapsedTime(0);
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
      <div className="app-header">
        <h1>切割優化系統 - 高效能版</h1>
        
        <div className="header-controls">
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
        </div>
      </div>

      <div className="app-main">
        <div className="left-panel">
          <div className="panel-tabs">
            <button 
              className={`tab ${activeTab === 'materials' ? 'active' : ''}`}
              onClick={() => setActiveTab('materials')}
            >
              母材設定 ({materials.length})
            </button>
            <button 
              className={`tab ${activeTab === 'parts' ? 'active' : ''}`}
              onClick={() => setActiveTab('parts')}
            >
              零件設定 ({parts.length})
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'materials' ? (
              <MaterialInput
                materials={materials}
                onAddMaterial={handleAddMaterial}
                onRemoveMaterial={handleRemoveMaterial}
              />
            ) : (
              <PartInput
                parts={parts}
                onAddPart={handleAddPart}
                onRemovePart={handleRemovePart}
              />
            )}
          </div>
          
          <div className="control-panel">
            <div className="loss-settings">
              <h3>切割參數</h3>
              <div className="loss-inputs">
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
            </div>
            
            <div className="summary-info">
              <div className="summary-item">
                <span className="label">總母材數量</span>
                <span className="value">{totalMaterials}</span>
              </div>
              <div className="summary-item">
                <span className="label">總零件數量</span>
                <span className="value">{totalParts}</span>
              </div>
            </div>
            
            {error && <div className="error">{error}</div>}
            
            <div className="action-buttons">
              <button 
                onClick={handleOptimize} 
                disabled={materials.length === 0 || parts.length === 0 || isOptimizing}
                className="btn-optimize"
              >
                {isOptimizing ? '優化中...' : '開始優化'}
              </button>
              <button onClick={handleClearAll} disabled={isOptimizing}>清除所有資料</button>
            </div>
          </div>
        </div>
        
        <div className="right-panel">
          {result && (
            <CuttingResult result={result} cuttingLoss={cuttingLoss} />
          )}
        </div>
      </div>
      
      <OptimizationProgress
        isOptimizing={isOptimizing}
        progress={optimizationProgress}
        stage={optimizationStage}
        estimatedTime={estimatedTime}
        elapsedTime={elapsedTime}
        onCancel={handleCancelOptimization}
      />

      <style jsx>{`
        .cutting-stock-app {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        .app-header {
          padding: 10px 20px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          position: relative;
          z-index: 10;
          overflow: visible;
        }
        
        .app-header h1 {
          font-size: 1.5rem;
          margin: 0 0 10px 0;
          text-align: center;
        }
        
        .header-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          position: relative;
        }
        
        .optimization-settings {
          display: flex;
          align-items: center;
        }
        
        .optimization-settings label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
        }
        
        .warning {
          color: #ff9800;
          font-size: 12px;
          margin-left: 10px;
        }
        
        .app-main {
          flex: 1;
          display: flex;
          overflow: hidden;
          height: calc(100vh - 100px);
        }
        
        .left-panel {
          width: 30%;
          min-width: 400px;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          background: #fafafa;
          border-right: 1px solid #ddd;
        }
        
        .right-panel {
          flex: 1;
          min-width: 700px;
          padding: 30px;
          overflow-y: auto;
          background: white;
        }
        
        .panel-tabs {
          display: flex;
          background: #e9ecef;
          border-bottom: 1px solid #ddd;
        }
        
        .tab {
          flex: 1;
          padding: 12px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #495057;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
        }
        
        .tab:hover {
          background: rgba(0,0,0,0.05);
        }
        
        .tab.active {
          background: white;
          color: #4CAF50;
          border-bottom-color: #4CAF50;
        }
        
        .tab-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .control-panel {
          background: white;
          padding: 20px;
          border-top: 1px solid #ddd;
        }
        
        .loss-settings {
          margin-bottom: 15px;
        }
        
        .loss-settings h3 {
          font-size: 1rem;
          margin: 0 0 10px 0;
          color: #333;
        }
        
        .loss-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .loss-inputs > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .loss-inputs label {
          font-weight: 500;
          font-size: 13px;
          color: #666;
        }
        
        .loss-inputs input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .summary-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }
        
        .summary-info .summary-item {
          text-align: center;
        }
        
        .summary-info .label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .summary-info .value {
          display: block;
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        
        .action-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .action-buttons button {
          flex: 1;
          padding: 10px 15px;
          font-size: 14px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .btn-optimize {
          background-color: #4CAF50;
          color: white;
          font-weight: 600;
        }
        
        .btn-optimize:hover:not(:disabled) {
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
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        
        @media (max-width: 1024px) {
          .app-main {
            flex-direction: column;
          }
          
          .left-panel {
            width: 100%;
            min-width: unset;
            height: 50%;
            border-right: none;
            border-bottom: 1px solid #ddd;
          }
          
          .right-panel {
            height: 50%;
          }
          
          .loss-inputs {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .header-controls {
            flex-direction: column;
            align-items: stretch;
          }
          
          .optimization-settings {
            margin-bottom: 10px;
          }
          
          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};