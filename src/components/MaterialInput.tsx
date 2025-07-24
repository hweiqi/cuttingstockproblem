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
        設定可用的母材長度，系統會自動選擇效率最高、餘料最少的母材進行排版
      </p>
      <div className="input-group">
        <input
          type="number"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          placeholder="輸入母材長度 (mm)"
          className="input"
        />
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
                <span>長度: {material.length} mm</span>
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
    </div>
  );
};