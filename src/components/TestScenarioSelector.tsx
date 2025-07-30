import React, { useState } from 'react';
import { RandomTestGenerator, PresetScenario } from '../utils/RandomTestGenerator';
import { Material, Part } from '../types';

interface TestScenarioSelectorProps {
  onApplyScenario: (parts: Part[], materials?: Material[]) => void;
}

export const TestScenarioSelector: React.FC<TestScenarioSelectorProps> = ({ onApplyScenario }) => {
  const [generator] = useState(() => new RandomTestGenerator());
  const [presetScenarios] = useState(() => generator.generatePresetScenarios());
  const [showSelector, setShowSelector] = useState(false);

  const handleRandomScenario = () => {
    const scenario = generator.generateTestScenario();
    onApplyScenario(scenario.parts, scenario.materials);
    setShowSelector(false);
  };

  const handlePresetScenario = (preset: PresetScenario) => {
    onApplyScenario(preset.scenario.parts, preset.scenario.materials);
    setShowSelector(false);
  };

  const handleCustomRandomScenario = () => {
    const config = {
      partCount: { min: 10, max: 25 },
      partLength: { min: 800, max: 4000 }
    };
    const scenario = generator.generateTestScenario(config);
    onApplyScenario(scenario.parts, scenario.materials);
    setShowSelector(false);
  };

  const handleLargeScaleScenario = () => {
    const config = {
      partCount: { min: 10000, max: 10000 },
      partLength: { min: 500, max: 5000 }
    };
    const scenario = generator.generateTestScenario(config);
    onApplyScenario(scenario.parts, scenario.materials);
    setShowSelector(false);
  };

  const handlePerformanceTestScenario = () => {
    if (!confirm('這將生成 50000 支零件的效能測試場景，用於標準效能測試。是否繼續？')) {
      return;
    }
    
    const config = {
      partCount: { min: 50000, max: 50000 },
      partLength: { min: 500, max: 5000 }
    };
    const scenario = generator.generateTestScenario(config);
    onApplyScenario(scenario.parts, scenario.materials);
    setShowSelector(false);
  };

  const handleUltraLargeScaleScenario = () => {
    if (!confirm('這將生成 100000 支零件的超大規模測試場景，可能需要較長時間處理。是否繼續？')) {
      return;
    }
    
    const config = {
      partCount: { min: 100000, max: 100000 },
      partLength: { min: 500, max: 5000 }
    };
    const scenario = generator.generateTestScenario(config);
    onApplyScenario(scenario.parts, scenario.materials);
    setShowSelector(false);
  };

  return (
    <div className="test-scenario-selector">
      <button 
        onClick={() => setShowSelector(!showSelector)} 
        className="btn btn-secondary"
        title="快速載入測試數據"
      >
        測試場景
      </button>

      {showSelector && (
        <div className="scenario-dropdown">
          <div className="scenario-section">
            <h4>隨機場景</h4>
            <button onClick={handleRandomScenario} className="scenario-btn">
              完全隨機
              <small>隨機生成零件</small>
            </button>
            <button onClick={handleCustomRandomScenario} className="scenario-btn">
              中等複雜度
              <small>10-25零件</small>
            </button>
          </div>

          <div className="scenario-section">
            <h4>大規模測試場景</h4>
            <button onClick={handleLargeScaleScenario} className="scenario-btn large-scale">
              大規模 (10,000支)
              <small>10,000零件</small>
            </button>
            <button onClick={handlePerformanceTestScenario} className="scenario-btn performance-test">
              效能測試 (50,000支)
              <small>標準效能測試場景</small>
            </button>
            <button onClick={handleUltraLargeScaleScenario} className="scenario-btn ultra-large-scale">
              終極規模 (100,000支)
              <small>100,000零件</small>
            </button>
          </div>

          <div className="scenario-section">
            <h4>預設場景</h4>
            {presetScenarios.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetScenario(preset)}
                className="scenario-btn"
              >
                {preset.name}
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .test-scenario-selector {
          position: relative;
          display: inline-block;
        }

        .scenario-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 5px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 350px;
          z-index: 1000;
          max-height: 600px;
          overflow-y: auto;
        }

        .scenario-section {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }

        .scenario-section:last-child {
          border-bottom: none;
        }

        .scenario-section h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #666;
        }

        .scenario-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 10px;
          margin-bottom: 8px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .scenario-btn:last-child {
          margin-bottom: 0;
        }

        .scenario-btn:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }

        .scenario-btn small {
          font-size: 12px;
          color: #6c757d;
          margin-top: 2px;
        }

        .scenario-btn.large-scale {
          background: #fff3cd;
          border-color: #ffeaa7;
        }

        .scenario-btn.large-scale:hover {
          background: #ffeaa7;
          border-color: #ffc107;
        }

        .scenario-btn.performance-test {
          background: #d4edda;
          border-color: #c3e6cb;
        }

        .scenario-btn.performance-test:hover {
          background: #c3e6cb;
          border-color: #28a745;
        }

        .scenario-btn.ultra-large-scale {
          background: #f8d7da;
          border-color: #f5c6cb;
        }

        .scenario-btn.ultra-large-scale:hover {
          background: #f5c6cb;
          border-color: #dc3545;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #5a6268;
        }
      `}</style>
    </div>
  );
};