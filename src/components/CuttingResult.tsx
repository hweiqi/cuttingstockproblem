import React from 'react';
import { CuttingResult as CuttingResultType } from '../types';

interface CuttingResultProps {
  result: CuttingResultType | null;
  cuttingLoss: number;
}

const formatAngle = (angle: number | undefined): string => {
  if (angle === undefined || angle === 90) return '90°';
  return `${angle}°`;
};

const formatAngles = (angles: any): string => {
  if (!angles) return '';
  return `左上:${formatAngle(angles.topLeft)} 右上:${formatAngle(angles.topRight)} 左下:${formatAngle(angles.bottomLeft)} 右下:${formatAngle(angles.bottomRight)}`;
};

export const CuttingResult: React.FC<CuttingResultProps> = ({ result, cuttingLoss = 3 }) => {
  if (!result) {
    return null;
  }

  return (
    <div className="cutting-result">
      <h2>排版結果</h2>
      
      <div className="result-summary">
        <div className="summary-item">
          <span className="label">使用母材數量:</span>
          <span className="value">{result.totalMaterialsUsed}</span>
        </div>
        <div className="summary-item">
          <span className="label">總體使用效率:</span>
          <span className="value">{result.overallEfficiency.toFixed(2)}%</span>
        </div>
        <div className="summary-item">
          <span className="label">總餘料長度:</span>
          <span className="value">{result.totalWaste.toFixed(2)} mm</span>
        </div>
        <div className="summary-item">
          <span className="label">排版耗時:</span>
          <span className="value">{result.executionTime} ms</span>
        </div>
      </div>

      {(result.sharedCutSummary || result.sharedCuttingInfo) && (
        <div className="shared-cut-summary">
          <h3>共刀優化摘要</h3>
          {result.sharedCuttingInfo && (
            <>
              <div className="summary-item">
                <span className="label">共刀切割數:</span>
                <span className="value">{result.sharedCuttingInfo.totalSharedCuts}</span>
              </div>
              {result.report && (
                <div className="v6-report">
                  <h4>V6優化報告:</h4>
                  <pre>{result.report}</pre>
                </div>
              )}
            </>
          )}
          {result.sharedCutSummary && (
            <>
              <div className="summary-item">
                <span className="label">共刀配對數:</span>
                <span className="value">{result.sharedCutSummary.totalPairs}</span>
              </div>
              <div className="summary-item">
                <span className="label">總節省材料:</span>
                <span className="value highlight">{result.sharedCutSummary.totalSavings.toFixed(2)} mm</span>
              </div>
              <div className="shared-pairs">
                <h4>共刀配對詳情:</h4>
                {result.sharedCutSummary.pairs.map((pair, index) => (
                  <div key={index} className="shared-pair-detail">
                    <div>配對 {index + 1}:</div>
                    <div className="pair-info">
                      <span>零件: {pair.part1Id} + {pair.part2Id}</span>
                      <span>匹配角度: {formatAngle(pair.matchedAngle)}</span>
                      <span>數量: {pair.quantity} 對</span>
                      <span className="savings">節省: {pair.savings.toFixed(2)} mm/對</span>
                      {pair.requiresFlip && <span>需要翻轉: {pair.flipDirection}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {result.unplacedParts.length > 0 && (
        <div className="unplaced-parts error">
          <h3>⚠️ 未能排版的零件</h3>
          <ul>
            {result.unplacedParts.map((part, index) => (
              <li key={index}>
                零件ID: {part.id}, 長度: {part.length} mm × {part.quantity} 支
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cut-plans">
        <h3>詳細排版方案</h3>
        {result.cutPlans.map((plan, index) => (
          <div key={index} className="cut-plan">
            <h4>母材 #{index + 1} (長度: {plan.materialLength} mm) {plan.isVirtual && '(虛擬材料)'}</h4>
            
            {plan.sharedCutPairs && plan.sharedCutPairs.length > 0 && (
              <div className="plan-shared-info">
                <strong>此母材包含 {plan.sharedCutPairs.length} 組共刀配對</strong>
              </div>
            )}
            
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
                                本次共刀節省: {(part as any).angleSavings.toFixed(2)} mm
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
                                  節省材料: {(part as any).angleSavings.toFixed(2)} mm
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
                <span>餘料: {(plan.waste || plan.wasteLength || 0).toFixed(2)} mm</span>
                <span>效率: {(plan.utilization ? plan.utilization * 100 : plan.efficiency).toFixed(2)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .cutting-result {
          margin-top: 30px;
        }

        .result-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .label {
          font-size: 14px;
          color: #666;
        }

        .value {
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }

        .value.highlight {
          color: #28a745;
        }

        .shared-cut-summary {
          margin: 25px 0;
          padding: 20px;
          background-color: #e3f2fd;
          border-radius: 8px;
          border: 1px solid #2196f3;
        }

        .shared-cut-summary h3 {
          color: #1976d2;
          margin-bottom: 15px;
        }

        .shared-pairs {
          margin-top: 15px;
        }

        .shared-pair-detail {
          margin: 10px 0;
          padding: 10px;
          background-color: white;
          border-radius: 4px;
        }

        .pair-info {
          display: flex;
          gap: 20px;
          margin-top: 5px;
          font-size: 14px;
          flex-wrap: wrap;
        }

        .savings {
          color: #28a745;
          font-weight: bold;
          background-color: #d4edda;
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid #c3e6cb;
          display: inline-block;
          margin-top: 5px;
        }
        
        .savings-icon {
          margin-right: 4px;
        }

        .unplaced-parts {
          margin: 20px 0;
          padding: 15px;
          background-color: #ffebee;
          border-radius: 8px;
          border: 1px solid #f44336;
        }

        .unplaced-parts.error h3 {
          color: #c62828;
          margin-bottom: 10px;
        }

        .cut-plans {
          margin-top: 30px;
        }

        .cut-plan {
          margin: 20px 0;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #fff;
        }

        .cut-plan h4 {
          margin-bottom: 15px;
          color: #333;
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
          background-color: #f5f5f5;
          border-radius: 4px;
          border-left: 4px solid #ddd;
        }

        .placed-part.shared-cut {
          background-color: #e8f5e9;
          border-left-color: #4caf50;
        }

        .shared-label {
          display: inline-block;
          padding: 2px 8px;
          background-color: #4caf50;
          color: white;
          border-radius: 3px;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .part-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 14px;
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
          font-size: 12px;
          padding: 8px;
          border-radius: 4px;
          margin: 5px 0;
        }
        
        .shared-cut-connection {
          background-color: #e8f5e9;
          border: 1px solid #4caf50;
        }
        
        .shared-cut-indicator {
          color: #2e7d32;
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 5px;
        }
        
        .shared-cut-details {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .saving-amount {
          color: #1b5e20;
          font-weight: bold;
          font-size: 12px;
        }
        
        .cutting-note {
          color: #558b2f;
          font-size: 11px;
          font-style: italic;
        }
        
        .normal-cut {
          color: #f44336;
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
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
      `}</style>
    </div>
  );
};