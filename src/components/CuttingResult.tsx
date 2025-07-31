import React, { useState } from 'react';
import { CuttingResult as CuttingResultType } from '../types';
import { PaginationConfig } from '../types/pagination';
import { PaginationService } from '../utils/PaginationService';
import { Pagination } from './Pagination';

interface CuttingResultProps {
  result: CuttingResultType | null;
  cuttingLoss: number;
}

const formatAngle = (angle: number | undefined): string => {
  if (angle === undefined || angle === 90) return '90°';
  return `${angle}°`;
};

// 母材顏色方案 - 使用深色系凸顯母材
const materialColorScheme = {
  bg: '#d4d4d8',     // 中灰色背景，與白色零件形成對比
  border: '#52525b'  // 深灰色邊框
};

const formatAngles = (angles: any): string => {
  if (!angles) return '';
  return `左上:${formatAngle(angles.topLeft)} 右上:${formatAngle(angles.topRight)} 左下:${formatAngle(angles.bottomLeft)} 右下:${formatAngle(angles.bottomRight)}`;
};

// 計算零件的形狀路徑
const getPartShapePath = (angles: any, isFlipped: boolean = false): string => {
  if (!angles) return '';
  
  // 預設都是90度角
  const topLeft = angles.topLeft || 90;
  const topRight = angles.topRight || 90;
  const bottomLeft = angles.bottomLeft || 90;
  const bottomRight = angles.bottomRight || 90;
  
  // 如果翻轉，則交換左右角度
  const tl = isFlipped ? topRight : topLeft;
  const tr = isFlipped ? topLeft : topRight;
  const bl = isFlipped ? bottomRight : bottomLeft;
  const br = isFlipped ? bottomLeft : bottomRight;
  
  // 計算斜邊的偏移量（假設最大偏移為20%的高度）
  const maxOffset = 20; // 20% 的高度
  const tlOffset = tl === 90 ? 0 : maxOffset * (1 - tl / 90);
  const trOffset = tr === 90 ? 0 : maxOffset * (1 - tr / 90);
  const blOffset = bl === 90 ? 0 : maxOffset * (1 - bl / 90);
  const brOffset = br === 90 ? 0 : maxOffset * (1 - br / 90);
  
  // 使用百分比來建立路徑
  return `polygon(
    ${tlOffset}% 0%,
    ${100 - trOffset}% 0%,
    100% ${trOffset}%,
    100% ${100 - brOffset}%,
    ${100 - brOffset}% 100%,
    ${blOffset}% 100%,
    0% ${100 - blOffset}%,
    0% ${tlOffset}%
  )`;
};

export const CuttingResult: React.FC<CuttingResultProps> = ({ result, cuttingLoss = 3 }) => {
  // 分頁狀態
  const [paginationConfig, setPaginationConfig] = useState<PaginationConfig>({
    currentPage: 1,
    itemsPerPage: 10
  });

  // 分頁服務
  const paginationService = new PaginationService();

  if (!result) {
    return null;
  }

  return (
    <div className="cutting-result">
      <div className="main-content">
        <h2>詳細排版方案</h2>
        <p className="plans-description">
          以下顯示每個母材的零件組合、排版位置、切割損耗及共刀資訊
        </p>
        
        {(() => {
          // 確保 cutPlans 存在且為陣列
          const cutPlans = result.cutPlans || [];
          
          if (cutPlans.length === 0) {
            return (
              <div className="no-plans">
                <p>沒有生成任何排版方案</p>
              </div>
            );
          }
          
          const paginatedResult = paginationService.paginate(cutPlans, paginationConfig);
          const startIndex = paginatedResult.pagination.startIndex;
          
          return (
            <>
              {/* 分頁控制 - 移至最上方 */}
              {cutPlans.length > paginationConfig.itemsPerPage && (
                <div className="pagination-wrapper-top">
                  <Pagination
                    paginationInfo={paginatedResult.pagination}
                    onPageChange={(page) => setPaginationConfig({ ...paginationConfig, currentPage: page })}
                    onItemsPerPageChange={(itemsPerPage) => setPaginationConfig({ currentPage: 1, itemsPerPage })}
                    showItemsPerPageSelector={true}
                  />
                </div>
              )}
              
              <div className="cut-plans">
                {paginatedResult.items.map((plan: any, index: number) => {
                return (
                  <div key={startIndex + index} className="cut-plan">
                    <h4>📏 母材 #{startIndex + index + 1} (長度: {plan.materialLength} mm) {plan.isVirtual && '(虛擬材料)'}</h4>
            
            {plan.sharedCutPairs && plan.sharedCutPairs.length > 0 && (
              <div className="plan-shared-info">
                <strong>🔗 此母材包含 {plan.sharedCutPairs.length} 組共刀配對</strong>
              </div>
            )}
            
            {/* 視覺化排版圖 */}
            <div className="visual-layout">
              <h5 className="visual-title">🗺️ 母材排版視覺化</h5>
              <div className="material-bar">
                <div className="material-length-label">0 mm</div>
                {(plan.cuts || plan.parts).map((part, partIndex) => {
                  // 取得零件的角度資訊
                  const angles = (part as any).part1Angles || (part as any).angles;
                  const shapePath = getPartShapePath(angles);
                  
                  return (
                    <React.Fragment key={partIndex}>
                      <div
                        className={`visual-part ${part.isSharedCut ? 'shared' : ''}`}
                        style={{
                          left: `${(part.position / plan.materialLength) * 100}%`,
                          width: `${(part.length / plan.materialLength) * 100}%`,
                          clipPath: shapePath || undefined
                        }}
                        title={`零件ID: ${part.partId}, 長度: ${part.length}mm, 位置: ${part.position}mm${angles ? '\n' + formatAngles(angles) : ''}`}
                      >
                        <span className="part-label">{part.partId}</span>
                        <span className="part-length">{part.length}mm</span>
                      </div>
                    {/* 在零件之間顯示切割損耗 */}
                    {partIndex < (plan.cuts || plan.parts).length - 1 && (
                      <div
                        className={`visual-cut-loss ${part.isSharedCut ? 'shared-cut' : 'normal-cut'}`}
                        style={{
                          left: `${((part.position + part.length) / plan.materialLength) * 100}%`,
                          width: `${(cuttingLoss / plan.materialLength) * 100}%`
                        }}
                        title={part.isSharedCut ? `共刀切割: ${cuttingLoss}mm` : `一般切割: ${cuttingLoss}mm`}
                      >
                        <div className="cut-loss-content">
                          <div className="cut-loss-line"></div>
                          <div className="cut-loss-label">
                            {part.isSharedCut ? (
                              <>
                                <span className="cut-type">共刀</span>
                                {(part as any).angleSavings && (
                                  <span className="savings-amount">省{((part as any).angleSavings).toFixed(0)}mm</span>
                                )}
                              </>
                            ) : (
                              <span className="cut-type">{cuttingLoss}mm</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    </React.Fragment>
                  );
                })}
                <div className="material-length-label" style={{ right: 0 }}>{plan.materialLength} mm</div>
              </div>
              <div className="material-scale">
                <div className="scale-marks">
                  {[0, 25, 50, 75, 100].map(percent => (
                    <div key={percent} className="scale-mark" style={{ left: `${percent}%` }}>
                      <span>{Math.round(plan.materialLength * percent / 100)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 圖例說明 */}
              <div className="visual-legend">
                <div className="legend-item">
                  <div className="legend-color normal-part"></div>
                  <span>一般零件</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color shared-part"></div>
                  <span>共刀零件</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color normal-cut-line"></div>
                  <span>一般切割線</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color shared-cut-line"></div>
                  <span>共刀切割線</span>
                </div>
              </div>
            </div>
            
            <div className="plan-details">
              <div className="parts-layout">
                {(plan.cuts || plan.parts).map((part, partIndex) => (
                  <React.Fragment key={partIndex}>
                    <div className={`placed-part ${part.isSharedCut ? 'shared-cut' : ''}`}>
                      <div className="part-info">
                        {part.isSharedCut ? (
                          <>
                            <div className="shared-label">【共刀】</div>
                            <div>零件ID: {part.partId}</div>
                            <div>長度: {part.length} mm</div>
                            {/* For V6 system cuts, we don't have sharedWith info directly */}
                            {(part as any).sharedWith && (
                              <>
                                <div>包含零件: {(part as any).sharedWith}</div>
                                {(part as any).sharedWith.includes(' + ') && (part as any).sharedWith.split(' + ').length > 2 && (
                                  <div className="chain-info">
                                    <div className="chain-label">多零件共刀鏈</div>
                                    <div>共刀數量: {(part as any).sharedWith.split(' + ').length} 個零件</div>
                                  </div>
                                )}
                              </>
                            )}
                            {(part as any).matchedAngle && (
                              <div>共刀角度: {formatAngle((part as any).matchedAngle)}</div>
                            )}
                            {(part as any).angleSavings && (
                              <div className="savings">
                                <span className="savings-icon">💰</span>
                                本次共刀節省: {((part as any).angleSavings ?? 0).toFixed(2)} mm
                              </div>
                            )}
                            {(part as any).part1Angles && (
                              <div className="angle-info">
                                <div>零件1角度: {formatAngles((part as any).part1Angles)}</div>
                              </div>
                            )}
                            {(part as any).part2Angles && (
                              <div className="angle-info">
                                <div>零件2角度: {formatAngles((part as any).part2Angles)}</div>
                              </div>
                            )}
                            {((part as any).part1Thickness || (part as any).part2Thickness) && (
                              <div>厚度: {(part as any).part1Thickness || (part as any).part2Thickness} mm</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>零件ID: {part.partId}</div>
                            <div>長度: {part.length} mm</div>
                            {(part as any).part1Angles && (
                              <div className="angle-info">
                                角度: {formatAngles((part as any).part1Angles)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="part-position">
                        位置: {part.position} mm
                      </div>
                    </div>
                    {partIndex < (plan.cuts || plan.parts).length - 1 && (
                      <div className="cutting-loss">
                        {part.isSharedCut ? (
                          <div className="shared-cut-connection">
                            <div className="shared-cut-indicator">
                              ✨ 共刀連接 ✨
                            </div>
                            {(part as any).angleSavings && (
                              <div className="shared-cut-details">
                                <div className="saving-amount">
                                  節省材料: {((part as any).angleSavings ?? 0).toFixed(2)} mm
                                </div>
                                <div className="cutting-note">
                                  (共刀切割正常損耗: {cuttingLoss} mm)
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="normal-cut">
                            ✂️ 切割損耗: {cuttingLoss} mm
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="plan-summary">
                <span>餘料: {(plan.waste ?? plan.wasteLength ?? 0).toFixed(2)} mm</span>
                <span>效率: {((plan.utilization ? plan.utilization * 100 : plan.efficiency) ?? 0).toFixed(2)}%</span>
              </div>
            </div>
                  </div>
                );
                })}
              </div>
            </>
          );
        })()}
      </div>
      
      {/* 輔助資訊區域 */}
      <div className="auxiliary-info">
        {/* 優化摘要 */}
        <div className="result-summary-compact">
          <h3>優化摘要</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">使用母材:</span>
              <span className="value">{result.totalMaterialsUsed} 支</span>
            </div>
            <div className="summary-item">
              <span className="label">總效率:</span>
              <span className="value">{(result.overallEfficiency ?? 0).toFixed(2)}%</span>
            </div>
            <div className="summary-item">
              <span className="label">總餘料:</span>
              <span className="value">{(result.totalWaste ?? 0).toFixed(2)} mm</span>
            </div>
            <div className="summary-item">
              <span className="label">耗時:</span>
              <span className="value">{result.executionTime} ms</span>
            </div>
          </div>
        </div>
        
        {/* 未排版零件 */}
        {result.unplacedParts.length > 0 && (
          <div className="unplaced-parts-compact">
            <h3>⚠️ 未能排版的零件 ({result.unplacedParts.length}個)</h3>
            <div className="unplaced-analysis">
              {/* 按原因分組顯示 */}
              {(() => {
                const reasonGroups = new Map<string, Array<{partId: string; instanceId: number; reason: string}>>();
                result.unplacedParts.forEach(part => {
                  const reason = part.reason || '未知原因';
                  if (!reasonGroups.has(reason)) {
                    reasonGroups.set(reason, []);
                  }
                  reasonGroups.get(reason)!.push(part);
                });
                
                console.log('[CuttingResult] 未排版零件分組:', reasonGroups);
                
                return Array.from(reasonGroups.entries()).map(([reason, parts]) => (
                  <div key={reason} className="reason-group">
                    <div className="reason-header">
                      <span className="reason-icon">🔍</span>
                      <span className="reason-text">{reason}</span>
                      <span className="reason-count">({parts.length}個)</span>
                    </div>
                    <div className="parts-list">
                      {parts.slice(0, 3).map((part, index) => (
                        <div key={index} className="unplaced-part-item">
                          零件 {part.partId}#{part.instanceId}
                        </div>
                      ))}
                      {parts.length > 3 && (
                        <div className="more-parts">
                          ...還有 {parts.length - 3} 個零件
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
        
        {/* V6優化報告 */}
        {result.report && (
          <div className="optimization-report">
            <h3>優化報告</h3>
            <pre>{result.report}</pre>
          </div>
        )}
      </div>

      <style jsx>{`
        .cutting-result {
          height: 100%;
          display: flex;
          gap: 20px;
          overflow: hidden;
        }
        
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .main-content h2 {
          margin: 0 0 15px 0;
          font-size: 1.5rem;
          color: #333;
          font-weight: 600;
        }
        
        .auxiliary-info {
          width: 300px;
          padding: 20px;
          background: #f8f9fa;
          border-left: 1px solid #e0e0e0;
          overflow-y: auto;
        }
        
        .auxiliary-info h3 {
          font-size: 1rem;
          color: #666;
          margin: 0 0 10px 0;
          font-weight: 600;
        }
        
        .result-summary-compact,
        .unplaced-parts-compact,
        .optimization-report {
          background: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .summary-grid .summary-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .summary-grid .label {
          font-size: 12px;
          color: #666;
        }
        
        .summary-grid .value {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .unplaced-analysis {
          padding: 0;
        }
        
        .reason-group {
          margin-bottom: 15px;
          border: 1px solid #ffcdd2;
          border-radius: 6px;
          background: #fafafa;
        }
        
        .reason-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: linear-gradient(to right, #ffebee, #fce4ec);
          border-bottom: 1px solid #ffcdd2;
          border-radius: 6px 6px 0 0;
        }
        
        .reason-icon {
          font-size: 14px;
        }
        
        .reason-text {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #c62828;
          line-height: 1.3;
        }
        
        .reason-count {
          font-size: 12px;
          color: #8e24aa;
          font-weight: 600;
          background: white;
          padding: 2px 6px;
          border-radius: 12px;
          border: 1px solid #e1bee7;
        }
        
        .parts-list {
          padding: 10px 12px;
        }
        
        .unplaced-part-item {
          font-size: 12px;
          color: #d32f2f;
          padding: 3px 0;
          border-left: 3px solid #ff5252;
          padding-left: 8px;
          margin-bottom: 4px;
          background: rgba(255, 82, 82, 0.05);
        }
        
        .more-parts {
          font-size: 12px;
          color: #666;
          font-style: italic;
          padding: 3px 0;
          margin-top: 6px;
          border-top: 1px dashed #ddd;
          padding-top: 6px;
        }
        
        .optimization-report pre {
          font-size: 12px;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          color: #555;
        }


        .cut-plans {
          flex: 1;
          overflow-y: auto;
          margin-top: 15px;
          padding-right: 10px;
        }
        
        .pagination-wrapper-top {
          margin-top: 15px;
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }
        
        .cut-plans h3 {
          margin: 0 0 10px 0;
          font-size: 1.2rem;
          color: #333;
          font-weight: 600;
        }
        
        .plans-description {
          font-size: 14px;
          color: #666;
          margin-bottom: 20px;
          background: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
        }

        .no-plans {
          padding: 40px;
          text-align: center;
          color: #666;
          font-style: italic;
          background-color: #f5f5f5;
          border-radius: 8px;
        }

        .cut-plan {
          margin: 15px 0;
          padding: 20px;
          border: 3px solid #d0d0d0;
          border-radius: 8px;
          background-color: #ffffff;
          box-shadow: 0 3px 8px rgba(0,0,0,0.08);
        }

        .cut-plan h4 {
          margin-bottom: 15px;
          color: #1f2937;
          font-size: 1.2rem;
          font-weight: 700;
          padding: 12px 16px;
          background: linear-gradient(to right, #f3f4f6, #e5e7eb);
          border-radius: 6px;
          border-left: 5px solid #3b82f6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .plan-shared-info {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #e3f2fd;
          border-radius: 4px;
          color: #1976d2;
        }

        .plan-details {
          margin-top: 15px;
        }

        .parts-layout {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .placed-part {
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border-left: 5px solid #ddd;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .placed-part.shared-cut {
          background-color: #e8f5e9;
          border-left-color: #4caf50;
          box-shadow: 0 2px 4px rgba(76, 175, 80, 0.15);
        }

        .shared-label {
          display: inline-block;
          padding: 4px 10px;
          background-color: #4caf50;
          color: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .part-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
        }
        
        .part-info > div {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }
        
        .part-info > div:first-of-type {
          font-weight: 600;
          color: #2c3e50;
        }

        .angle-info {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        .part-position {
          margin-top: 10px;
          font-size: 12px;
          color: #666;
        }

        .cutting-loss {
          text-align: center;
          font-size: 13px;
          padding: 10px;
          border-radius: 6px;
          margin: 10px 20px;
          position: relative;
        }
        
        .cutting-loss::before,
        .cutting-loss::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 20px;
          height: 1px;
          background-color: #999;
        }
        
        .cutting-loss::before {
          left: -20px;
        }
        
        .cutting-loss::after {
          right: -20px;
        }
        
        .shared-cut-connection {
          background-color: #e8f5e9;
          border: 2px solid #4caf50;
          box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2);
        }
        
        .shared-cut-indicator {
          color: #2e7d32;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .shared-cut-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .saving-amount {
          color: #1b5e20;
          font-weight: bold;
          font-size: 13px;
        }
        
        .cutting-note {
          color: #558b2f;
          font-size: 12px;
          font-style: italic;
        }
        
        .normal-cut {
          color: #d32f2f;
          background-color: #ffebee;
          border: 2px dashed #ff5252;
          font-weight: 500;
        }

        .plan-summary {
          display: flex;
          justify-content: space-between;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .chain-info {
          margin-top: 10px;
          padding: 8px;
          background-color: #fff3cd;
          border-radius: 4px;
          border: 1px solid #ffeaa7;
        }
        
        .chain-label {
          font-weight: bold;
          color: #856404;
          margin-bottom: 5px;
        }
        
        .v6-report {
          margin-top: 15px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        
        .v6-report pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 12px;
          color: #333;
          margin: 10px 0;
        }
        
        .visual-layout {
          margin: 30px 0;
          padding: 25px;
          background: #f0f0f0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          border: 2px solid #d0d0d0;
        }
        
        .material-bar {
          position: relative;
          height: 100px;
          background: #71717a;
          border: 4px solid #3f3f46;
          border-radius: 8px;
          margin: 40px 0 60px 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25), inset 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .material-length-label {
          position: absolute;
          top: -30px;
          font-size: 14px;
          color: #1a1a1a;
          font-weight: 700;
          background: #fbbf24;
          padding: 4px 8px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .visual-part {
          position: absolute;
          top: 10px;
          height: 80px;
          background: #ffffff;
          border: 3px solid #1f2937;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 3px 6px rgba(0,0,0,0.2);
          min-width: 30px;
          overflow: hidden;
        }
        
        .visual-part:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          z-index: 2;
          border-color: #212529;
        }
        
        .visual-part.shared {
          background: #dcfce7;
          border-color: #16a34a;
          box-shadow: 0 3px 6px rgba(22, 163, 74, 0.3);
        }
        
        .visual-title {
          margin: 0 0 15px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          padding: 8px 12px;
          background: #e0e0e0;
          border-radius: 4px;
          display: inline-block;
        }
        
        .part-label {
          display: block;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: #fef3c7;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #f59e0b;
          text-shadow: 0 1px 1px rgba(0,0,0,0.05);
        }
        
        .part-length {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: #495057;
          margin-top: 3px;
          background: rgba(255,255,255,0.8);
          padding: 1px 4px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .material-scale {
          position: relative;
          height: 30px;
          margin-top: 10px;
        }
        
        .scale-marks {
          position: relative;
          height: 100%;
        }
        
        .scale-mark {
          position: absolute;
          bottom: 0;
          width: 2px;
          height: 12px;
          background: #fbbf24;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .scale-mark span {
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .visual-cut-loss {
          position: absolute;
          top: 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          min-width: 20px;
        }
        
        .cut-loss-content {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .cut-loss-line {
          position: absolute;
          top: 10px;
          bottom: 10px;
          width: 3px;
          background: #333;
        }
        
        .visual-cut-loss.normal-cut .cut-loss-line {
          background: #dc3545;
          box-shadow: none;
        }
        
        .visual-cut-loss.shared-cut .cut-loss-line {
          background: #28a745;
          box-shadow: none;
        }
        
        .cut-loss-label {
          position: absolute;
          bottom: -25px;
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        
        .visual-cut-loss.normal-cut .cut-loss-label {
          color: #dc3545;
          border: 1px solid #dc3545;
        }
        
        .visual-cut-loss.shared-cut .cut-loss-label {
          color: #28a745;
          border: 1px solid #28a745;
        }
        
        .cut-type {
          font-size: 10px;
        }
        
        .savings-amount {
          font-size: 9px;
          font-weight: 700;
          color: #1b5e20;
        }
        
        .visual-legend {
          display: flex;
          gap: 20px;
          margin-top: 20px;
          padding: 12px 16px;
          background: #ffffff;
          border-radius: 6px;
          font-size: 13px;
          border: 2px solid #d1d5db;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .legend-color {
          width: 20px;
          height: 20px;
          border-radius: 3px;
        }
        
        .legend-color.normal-part {
          background: #ffffff;
          border: 2px solid #495057;
        }
        
        .legend-color.shared-part {
          background: #e8f5e9;
          border: 2px solid #388e3c;
        }
        
        .legend-color.normal-cut-line {
          background: #dc3545;
          height: 3px;
          margin: 8px 0;
          border-radius: 2px;
        }
        
        .legend-color.shared-cut-line {
          background: #28a745;
          height: 3px;
          margin: 8px 0;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};