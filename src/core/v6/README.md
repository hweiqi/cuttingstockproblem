# V6 共刀系統架構設計

## 核心改進

### 1. 靈活的角度匹配系統
- 不再要求角度完全相同
- 支援角度容差（如32度和35度可以共刀）
- 支援不同位置的角度匹配（如A的左上角可以和B的右上角共刀）

### 2. 動態共刀鏈構建
- 共刀鏈可以包含多種不同的零件
- 支援複雜的共刀組合（如A-B-A-C-B）
- 自動尋找最優的共刀組合

### 3. 完整排版保證
- 確保所有零件都被排版
- 必要時創建虛擬材料
- 優先考慮共刀優化，但不犧牲排版完整性

## 模組結構

```
v6/
├── models/
│   ├── Part.ts          # 零件模型
│   ├── SharedCut.ts     # 共刀定義
│   └── Chain.ts         # 共刀鏈模型
├── matching/
│   ├── AngleMatcher.ts  # 角度匹配器
│   └── FlexibleMatcher.ts # 靈活匹配器
├── optimization/
│   ├── ChainBuilder.ts  # 共刀鏈構建器
│   └── DynamicOptimizer.ts # 動態優化器
├── placement/
│   └── ../../../placement/OptimizedPlacer.ts # 優化排版器（支援無限材料）
└── system/
    └── V6System.ts      # 完整系統
```