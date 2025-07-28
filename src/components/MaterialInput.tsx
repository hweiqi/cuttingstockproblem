import React, { useState } from 'react';
import { Material } from '../types';

interface MaterialInputProps {
  materials: Material[];
  onAddMaterial: (length: number) => void;
  onRemoveMaterial: (id: string) => void;
}

export const MaterialInput: React.FC<MaterialInputProps> = ({
  materials,
  onAddMaterial,
  onRemoveMaterial
}) => {
  const [length, setLength] = useState('');
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

    onAddMaterial(lengthNum);

    setLength('');
    setError('');
  };

  return (
    <div className="material-input">
      <h2>母材設定</h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
        設定可用的母材長度，系統會自動選擇效率最高、餘料最少的母材進行排版。
        所有母材均為無限供應。
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
                    數量: 無限供應
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