import React, { useState } from 'react';
import { Part, PartAngles } from '../types';
import { PaginationConfig } from '../types/pagination';
import { PaginationService } from '../utils/PaginationService';
import { Pagination } from './Pagination';

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

  // 分頁狀態
  const [paginationConfig, setPaginationConfig] = useState<PaginationConfig>({
    currentPage: 1,
    itemsPerPage: 10
  });

  // 分頁服務
  const paginationService = new PaginationService<Part>();

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
          <>
            {/* 分頁的零件列表 */}
            <ul>
              {(() => {
                const paginatedResult = paginationService.paginate(parts, paginationConfig);
                return paginatedResult.items.map((part) => (
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
                ));
              })()}
            </ul>
            
            {/* 分頁控制 */}
            {parts.length > paginationConfig.itemsPerPage && (
              <Pagination
                paginationInfo={paginationService.paginate(parts, paginationConfig).pagination}
                onPageChange={(page) => setPaginationConfig({ ...paginationConfig, currentPage: page })}
                onItemsPerPageChange={(itemsPerPage) => setPaginationConfig({ currentPage: 1, itemsPerPage })}
                showItemsPerPageSelector={true}
              />
            )}
          </>
        )}
      </div>
      
      <style jsx>{`
        .part-input {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .part-input h2 {
          margin: 0 0 10px 0;
          font-size: 1.2rem;
          color: #333;
        }
        
        .part-input h3 {
          margin: 15px 0 10px 0;
          font-size: 1rem;
          color: #555;
        }
        
        .input-section {
          margin-bottom: 15px;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .angle-toggle {
          margin: 10px 0;
        }
        
        .angle-inputs {
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .angle-inputs h4 {
          margin: 0 0 10px 0;
          font-size: 0.9rem;
          color: #666;
        }
        
        .angle-grid {
          display: grid;
          gap: 10px;
        }
        
        .angle-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .angle-input-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .angle-input-group label {
          font-size: 12px;
          color: #666;
          min-width: 40px;
        }
        
        .part-list {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        
        .part-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .part-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
          margin-bottom: 6px;
          font-size: 14px;
        }
        
        .part-item > div {
          flex: 1;
        }
        
        .angle-info {
          display: block;
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background-color: #4CAF50;
          color: white;
          width: 100%;
        }
        
        .btn-primary:hover {
          background-color: #45a049;
        }
        
        .btn-danger {
          background-color: #dc3545;
          color: white;
        }
        
        .btn-danger:hover {
          background-color: #c82333;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }
        
        .input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          flex: 1;
        }
        
        .input-sm {
          width: 60px;
        }
        
        .input:focus {
          outline: none;
          border-color: #4CAF50;
          box-shadow: 0 0 0 2px rgba(76,175,80,0.25);
        }
        
        .error {
          color: #dc3545;
          font-size: 12px;
          margin-top: 5px;
          padding: 6px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
        
        label {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        
        input[type="checkbox"] {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};