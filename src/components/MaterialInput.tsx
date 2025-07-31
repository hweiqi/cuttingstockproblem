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
        .material-input {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .material-input h2 {
          margin: 0 0 10px 0;
          font-size: 1.2rem;
          color: #333;
        }
        
        .material-input h3 {
          margin: 15px 0 10px 0;
          font-size: 1rem;
          color: #555;
        }
        
        .input-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
        }
        
        .material-list {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
        
        .material-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .material-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: #f9f9f9;
          margin-bottom: 6px;
        }
        
        .material-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .material-length {
          font-weight: 500;
          color: #333;
          font-size: 14px;
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
      `}</style>
    </div>
  );
};