import React from 'react';

interface ProgressIndicatorProps {
  progress: number; // 0-100
  message?: string;
  isIndeterminate?: boolean;
  showPercentage?: boolean;
  className?: string;
}

/**
 * 進度指示器組件
 * 用於顯示優化計算的進度
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  message = '處理中...',
  isIndeterminate = false,
  showPercentage = true,
  className = ''
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`progress-indicator ${className}`}>
      <div className="progress-message">
        <span>{message}</span>
        {showPercentage && !isIndeterminate && (
          <span className="progress-percentage">{Math.round(clampedProgress)}%</span>
        )}
      </div>
      
      <div className="progress-bar-container">
        <div
          className={`progress-bar ${isIndeterminate ? 'indeterminate' : ''}`}
          style={!isIndeterminate ? { width: `${clampedProgress}%` } : undefined}
        />
      </div>

      <style jsx>{`
        .progress-indicator {
          padding: 16px;
          background: #f5f5f5;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
          color: #333;
        }

        .progress-percentage {
          font-weight: 600;
          color: #1976d2;
        }

        .progress-bar-container {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #1976d2 0%, #2196f3 100%);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-bar.indeterminate {
          width: 30%;
          position: absolute;
          animation: indeterminate 1.5s infinite linear;
        }

        @keyframes indeterminate {
          0% {
            left: -30%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
};

interface OptimizationProgressProps {
  isOptimizing: boolean;
  progress: number;
  stage?: string;
  estimatedTime?: number;
  elapsedTime?: number;
  onCancel?: () => void;
}

/**
 * 優化進度組件
 * 顯示完整的優化進度資訊
 */
export const OptimizationProgress: React.FC<OptimizationProgressProps> = ({
  isOptimizing,
  progress,
  stage = '初始化...',
  estimatedTime = 0,
  elapsedTime = 0,
  onCancel
}) => {
  if (!isOptimizing) return null;

  // 根據進度計算共刀分析的子進度
  const getDetailedStage = () => {
    if (stage.includes('分析共刀潛力')) {
      // 在分析階段顯示更詳細的進度
      if (progress < 11) return '正在讀取零件資料...';
      if (progress < 22) return '正在分析零件角度...';
      if (progress < 33) return '正在搜尋共刀配對...';
      return stage;
    }
    return stage;
  };

  return (
    <div className="optimization-progress">
      <h3>正在優化排版</h3>
      
      {/* 時間資訊 */}
      {(estimatedTime > 0 || elapsedTime > 0) && (
        <div className="time-info">
          <div className="time-item">
            <span className="time-label">預估時間：</span>
            <span className="time-value">{formatTime(estimatedTime)}</span>
          </div>
          <div className="time-item">
            <span className="time-label">已經過：</span>
            <span className="time-value">{formatTime(elapsedTime)}</span>
          </div>
          <div className="time-item">
            <span className="time-label">剩餘時間：</span>
            <span className="time-value">
              {elapsedTime >= estimatedTime 
                ? '即將完成...' 
                : formatTime(Math.max(0, estimatedTime - elapsedTime))}
            </span>
          </div>
        </div>
      )}
      
      <ProgressIndicator
        progress={progress}
        message={getDetailedStage()}
        showPercentage={true}
      />
      
      {/* 共刀分析的詳細資訊 */}
      {stage.includes('分析共刀潛力') && (
        <div className="analysis-details">
          <div className="detail-item">
            <span className="detail-label">🔍 正在分析的零件角度配對</span>
            <span className="detail-value">從系統中尋找最佳配對...</span>
          </div>
          <div className="progress-hint">
            提示：共刀分析會檢查所有零件的角度相容性
          </div>
        </div>
      )}

      {onCancel && (
        <button
          className="cancel-button"
          onClick={onCancel}
          disabled={progress >= 95}
        >
          取消優化
        </button>
      )}

      <style jsx>{`
        .optimization-progress {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          min-width: 400px;
          z-index: 1000;
        }

        h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
          text-align: center;
        }

        .cancel-button {
          margin-top: 16px;
          width: 100%;
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .cancel-button:hover:not(:disabled) {
          background: #d32f2f;
        }

        .cancel-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .analysis-details {
          margin-top: 16px;
          padding: 12px;
          background: #f0f7ff;
          border-radius: 6px;
          border: 1px solid #b3d9ff;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .detail-label {
          font-size: 13px;
          color: #0066cc;
          font-weight: 500;
        }
        
        .detail-value {
          font-size: 12px;
          color: #666;
        }
        
        .progress-hint {
          font-size: 12px;
          color: #888;
          font-style: italic;
          margin-top: 8px;
        }
        
        .time-info {
          display: flex;
          justify-content: space-between;
          margin: 12px 0 16px 0;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }
        
        .time-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        
        .time-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .time-value {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
      `}</style>
    </div>
  );
};

// 格式化時間顯示
function formatTime(milliseconds: number): string {
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

interface PerformanceMetricsProps {
  metrics: {
    totalParts: number;
    processingTime: number;
    materialUtilization: number;
    optimizationMethod: string;
  };
}

/**
 * 效能指標組件
 * 顯示優化的效能數據
 */
export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="performance-metrics">
      <h4>優化效能指標</h4>
      
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">總零件數</span>
          <span className="metric-value">{metrics.totalParts}</span>
        </div>
        
        <div className="metric">
          <span className="metric-label">處理時間</span>
          <span className="metric-value">{formatTime(metrics.processingTime)}</span>
        </div>
        
        <div className="metric">
          <span className="metric-label">材料利用率</span>
          <span className="metric-value">{formatPercentage(metrics.materialUtilization)}</span>
        </div>
        
        <div className="metric">
          <span className="metric-label">優化方法</span>
          <span className="metric-value">{metrics.optimizationMethod}</span>
        </div>
      </div>

      <style jsx>{`
        .performance-metrics {
          margin-top: 16px;
          padding: 16px;
          background: #f9f9f9;
          border-radius: 8px;
        }

        h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #333;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .metric {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 16px;
          font-weight: 600;
          color: #1976d2;
        }

        @media (max-width: 600px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};