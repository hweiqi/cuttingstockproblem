import React, { useState } from 'react';
import { Material } from '../types';

interface MaterialInputProps {
  materials: Material[];
  onAddMaterial: (length: number) => void;
  onAddMaterialWithQuantity: (length: number, quantity: number) => void;
  onRemoveMaterial: (id: string) => void;
}

export const MaterialInput: React.FC<MaterialInputProps> = ({
  materials,
  onAddMaterial,
  onAddMaterialWithQuantity,
  onRemoveMaterial
}) => {
  const [length, setLength] = useState('');
  const [quantity, setQuantity] = useState('');
  const [useCustomQuantity, setUseCustomQuantity] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = () => {
    const lengthNum = parseInt(length);
    
    if (!length || isNaN(lengthNum)) {
      setError('請輸入有效的長度');
      return;
    }
    
    if (lengthNum <= 0) {
      setError('長度必須大於 0');
      return;
    }

    if (useCustomQuantity) {
      const quantityNum = parseInt(quantity);
      if (quantity !== '' && (isNaN(quantityNum) || quantityNum < 0)) {
        setError('數量必須是非負整數（0表示無限供應）');
        return;
      }
      const finalQuantity = quantity === '' ? 0 : quantityNum;
      onAddMaterialWithQuantity(lengthNum, finalQuantity);
    } else {
      onAddMaterial(lengthNum);
    }

    setLength('');
    setQuantity('');
    setError('');
  };

  return (
    <div className="material-input">
      <h2>母材設定</h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
        設定可用的母材長度，系統會自動選擇效率最高、餘料最少的母材進行排版。
        預設為無限供應，可設定特定數量。
      </p>
      
      <div className="input-section">
        <div className="input-group">
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="輸入母材長度 (mm)"
            className="input"
          />
        </div>
        
        <div className="quantity-section">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={useCustomQuantity}
              onChange={(e) => setUseCustomQuantity(e.target.checked)}
            />
            <span className="checkmark"></span>
            設定數量限制
          </label>
          
          {useCustomQuantity && (
            <div className="quantity-input">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="數量 (空白或0=無限)"
                className="input input-sm"
                min="0"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                0 或空白表示無限供應
              </small>
            </div>
          )}
        </div>
        
        <button onClick={handleAdd} className="btn btn-primary">
          新增母材
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      
      <div className="material-list">
        <h3>已設定的母材</h3>
        {materials.length === 0 ? (
          <p>尚未設定任何母材</p>
        ) : (
          <ul>
            {materials.map((material) => (
              <li key={material.id} className="material-item">
                <div className="material-info">
                  <span className="material-length">長度: {material.length} mm</span>
                  <span className="material-quantity">
                    數量: {material.quantity === 0 ? '無限供應' : `${material.quantity} 支`}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveMaterial(material.id)}
                  className="btn btn-danger btn-sm"
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <style jsx>{`
        .input-section {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
        }
        
        .quantity-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .checkbox-container input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
        }
        
        .quantity-input {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-left: 20px;
        }
        
        .input-sm {
          max-width: 200px;
        }
        
        .material-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background-color: #f9f9f9;
          margin-bottom: 8px;
        }
        
        .material-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .material-length {
          font-weight: 500;
          color: #333;
        }
        
        .material-quantity {
          font-size: 12px;
          color: #666;
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
          background-color: #007bff;
          color: white;
          align-self: flex-start;
        }
        
        .btn-primary:hover {
          background-color: #0056b3;
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
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .error {
          color: #dc3545;
          font-size: 14px;
          margin-top: 5px;
          padding: 8px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};