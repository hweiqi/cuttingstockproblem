import React, { useState } from 'react';
import { RandomTestGenerator, PresetScenario } from '../utils/RandomTestGenerator';
import { Material, Part } from '../types';

interface TestScenarioSelectorProps {
  onApplyScenario: (materials: Material[], parts: Part[]) => void;
}

export const TestScenarioSelector: React.FC<TestScenarioSelectorProps> = ({ onApplyScenario }) => {
  const [generator] = useState(() => new RandomTestGenerator());
  const [presetScenarios] = useState(() => generator.generatePresetScenarios());
  const [showSelector, setShowSelector] = useState(false);

  const handleRandomScenario = () => {
    const scenario = generator.generateTestScenario();
    onApplyScenario(scenario.materials, scenario.parts);
    setShowSelector(false);
  };

  const handlePresetScenario = (preset: PresetScenario) => {
    onApplyScenario(preset.scenario.materials, preset.scenario.parts);
    setShowSelector(false);
  };

  const handleCustomRandomScenario = () => {
    const config = {
      materialCount: { min: 5, max: 12 },
      partCount: { min: 10, max: 25 },
      materialLength: { min: 4000, max: 12000 },
      partLength: { min: 800, max: 4000 }
    };
    const scenario = generator.generateTestScenario(config);
    onApplyScenario(scenario.materials, scenario.parts);
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
              <small>隨機生成材料和零件</small>
            </button>
            <button onClick={handleCustomRandomScenario} className="scenario-btn">
              中等複雜度
              <small>5-12材料, 10-25零件</small>
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
          width: 300px;
          z-index: 1000;
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