import React, { useState } from 'react';
import { Part, PartAngles } from '../types';

interface PartInputProps {
  parts: Part[];
  onAddPart: (length: number, quantity: number, angles?: PartAngles) => void;
  onRemovePart: (id: string) => void;
}

export const PartInput: React.FC<PartInputProps> = ({
  parts,
  onAddPart,
  onRemovePart
}) => {
  const [length, setLength] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');
  const [showAngles, setShowAngles] = useState(false);
  const [angles, setAngles] = useState({
    topLeft: '0',
    topRight: '0',
    bottomLeft: '0',
    bottomRight: '0'
  });

  const handleAdd = () => {
    const lengthNum = parseInt(length);
    const quantityNum = parseInt(quantity);
    
    if (!length || isNaN(lengthNum)) {
      setError('請輸入有效的長度');
      return;
    }
    
    if (lengthNum <= 0) {
      setError('長度必須大於 0');
      return;
    }

    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      setError('數量必須大於 0');
      return;
    }

    // Validate angles if shown
    let partAngles: PartAngles | undefined;
    if (showAngles) {
      const topLeftNum = parseInt(angles.topLeft);
      const topRightNum = parseInt(angles.topRight);
      const bottomLeftNum = parseInt(angles.bottomLeft);
      const bottomRightNum = parseInt(angles.bottomRight);

      if (isNaN(topLeftNum) || isNaN(topRightNum) || isNaN(bottomLeftNum) || isNaN(bottomRightNum)) {
        setError('所有角度必須為數字');
        return;
      }

      // 斜切角度必須在 0-89 度之間
      if (topLeftNum < 0 || topLeftNum > 89 || topRightNum < 0 || topRightNum > 89 ||
          bottomLeftNum < 0 || bottomLeftNum > 89 || bottomRightNum < 0 || bottomRightNum > 89) {
        setError('斜切角度必須在 0 到 89 度之間');
        return;
      }

      // 檢查左側不能同時有上下角度（0度表示無角度）
      if (topLeftNum > 0 && bottomLeftNum > 0) {
        setError('左側不能同時有上下斜切角度');
        return;
      }

      // 檢查右側不能同時有上下角度（0度表示無角度）
      if (topRightNum > 0 && bottomRightNum > 0) {
        setError('右側不能同時有上下斜切角度');
        return;
      }

      partAngles = {
        topLeft: topLeftNum,
        topRight: topRightNum,
        bottomLeft: bottomLeftNum,
        bottomRight: bottomRightNum
      };
    }

    onAddPart(lengthNum, quantityNum, partAngles);
    setLength('');
    setQuantity('1');
    setError('');
    setAngles({
      topLeft: '0',
      topRight: '0',
      bottomLeft: '0',
      bottomRight: '0'
    });
  };

  const getTotalParts = () => {
    return parts.reduce((sum, part) => sum + part.quantity, 0);
  };

  return (
    <div className="part-input">
      <h2>零件設定</h2>
      <div className="input-group">
        <input
          type="number"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          placeholder="輸入零件長度 (mm)"
          className="input"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="數量"
          className="input input-sm"
        />
        <button onClick={handleAdd} className="btn btn-primary">
          新增零件
        </button>
      </div>
      
      <div className="angle-toggle">
        <label>
          <input
            type="checkbox"
            checked={showAngles}
            onChange={(e) => setShowAngles(e.target.checked)}
          />
          設定零件角度（用於共刀計算）
        </label>
      </div>

      {showAngles && (
        <div className="angle-inputs">
          <h4>零件角度設定（0-89度，90度=無斜切）</h4>
          <div className="angle-hint">
            <small>⚠️ 左側或右側不能同時有上下斜切角度</small>
          </div>
          <div className="angle-grid">
            <div className="angle-row">
              <div className="angle-input-group">
                <label>左上角:</label>
                <input
                  type="number"
                  value={angles.topLeft}
                  onChange={(e) => setAngles({...angles, topLeft: e.target.value})}
                  placeholder="0"
                  className="input input-sm"
                  min="0"
                  max="89"
                />
              </div>
              <div className="angle-input-group">
                <label>右上角:</label>
                <input
                  type="number"
                  value={angles.topRight}
                  onChange={(e) => setAngles({...angles, topRight: e.target.value})}
                  placeholder="0"
                  className="input input-sm"
                  min="0"
                  max="89"
                />
              </div>
            </div>
            <div className="angle-row">
              <div className="angle-input-group">
                <label>左下角:</label>
                <input
                  type="number"
                  value={angles.bottomLeft}
                  onChange={(e) => setAngles({...angles, bottomLeft: e.target.value})}
                  placeholder="0"
                  className="input input-sm"
                  min="0"
                  max="89"
                />
              </div>
              <div className="angle-input-group">
                <label>右下角:</label>
                <input
                  type="number"
                  value={angles.bottomRight}
                  onChange={(e) => setAngles({...angles, bottomRight: e.target.value})}
                  placeholder="0"
                  className="input input-sm"
                  min="0"
                  max="89"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      
      <div className="part-list">
        <h3>已設定的零件 (總數: {getTotalParts()})</h3>
        {parts.length === 0 ? (
          <p>尚未設定任何零件</p>
        ) : (
          <ul>
            {parts.map((part) => (
              <li key={part.id} className="part-item">
                <div>
                  <span>長度: {part.length} mm × {part.quantity} 支</span>
                  {part.angles && (
                    <span className="angle-info">
                      （角度: 左上{part.angles.topLeft}° 右上{part.angles.topRight}° 
                      左下{part.angles.bottomLeft}° 右下{part.angles.bottomRight}°）
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemovePart(part.id)}
                  className="btn btn-danger btn-sm"
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};