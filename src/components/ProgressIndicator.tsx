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
  onCancel
}) => {
  if (!isOptimizing) return null;

  const getStageMessage = () => {
    if (progress < 10) return '初始化優化系統...';
    if (progress < 30) return '分析零件共刀潛力...';
    if (progress < 50) return '構建共刀鏈...';
    if (progress < 80) return '執行排版優化...';
    if (progress < 100) return '完成最終優化...';
    return '優化完成！';
  };

  return (
    <div className="optimization-progress">
      <h3>正在優化排版</h3>
      
      <ProgressIndicator
        progress={progress}
        message={stage || getStageMessage()}
        showPercentage={true}
      />

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
      `}</style>
    </div>
  );
};

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