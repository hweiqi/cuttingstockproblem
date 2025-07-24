# 鋼構排版優化系統 V6

一個高效的切割排版優化系統，專為鋼構件製造設計，支援複雜的共刀優化和角度匹配。

## 系統特色

### 核心功能
- **智能共刀優化**: 自動識別可共享切割的零件，減少材料浪費
- **靈活角度匹配**: 支援不同位置的角度匹配（如topLeft與topRight）
- **角度容差**: ±5度的容差範圍，更實際地處理製造誤差
- **混合零件鏈**: 可將不同類型的零件組合成共刀鏈
- **100%排版保證**: 使用虛擬材料確保所有零件都能被排版

### 技術優勢
- 使用TypeScript開發，類型安全
- 模組化架構設計
- 完整的單元測試和整合測試
- 高效能演算法，支援大規模零件處理

## 快速開始

### 安裝依賴
```bash
npm install
```

### 開發模式
```bash
npm run dev
```
瀏覽器開啟 [http://localhost:3000](http://localhost:3000)

### 執行測試
```bash
npm test
```

### 建置專案
```bash
npm run build
```

## 系統架構

```
src/
├── components/          # React 元件
│   ├── CuttingStockApp.tsx    # 主應用元件
│   ├── MaterialInput.tsx      # 材料輸入元件
│   ├── PartInput.tsx         # 零件輸入元件
│   └── CuttingResult.tsx     # 結果顯示元件
│
├── core/v6/            # V6 核心系統
│   ├── matching/       # 角度匹配模組
│   │   └── FlexibleAngleMatcher.ts
│   ├── optimization/   # 優化演算法
│   │   └── DynamicChainBuilder.ts
│   ├── placement/      # 排版策略
│   │   └── GuaranteedPlacer.ts
│   └── system/        # 系統整合
│       └── V6System.ts
│
├── services/          # 服務層
│   ├── V6CuttingService.ts   # V6切割服務
│   ├── MaterialService.ts    # 材料管理
│   └── PartService.ts       # 零件管理
│
└── types/            # TypeScript 類型定義
    └── index.ts
```

## 使用範例

### 基本使用
```typescript
import { V6CuttingService } from './services/V6CuttingService';

const service = new V6CuttingService();

// 定義材料
const materials = [
  { id: 'M1', length: 6000 },
  { id: 'M2', length: 12000 }
];

// 定義零件
const parts = [
  {
    id: 'P1',
    length: 2000,
    quantity: 3,
    angles: {
      topLeft: 33,
      topRight: 33,
      bottomLeft: 90,
      bottomRight: 90
    }
  },
  {
    id: 'P2',
    length: 3000,
    quantity: 2,
    angles: {
      topLeft: 35,  // 在容差範圍內，可與P1共刀
      topRight: 90,
      bottomLeft: 33,
      bottomRight: 90
    }
  }
];

// 執行優化
const result = service.optimizeCutting(materials, parts);
```

## 測試說明

系統包含完整的測試套件：

### 單元測試
- `FlexibleAngleMatcher.test.ts`: 角度匹配邏輯測試
- `DynamicChainBuilder.test.ts`: 共刀鏈構建測試
- `GuaranteedPlacer.test.ts`: 排版保證測試

### 整合測試
- `V6SystemIntegration.test.ts`: 完整系統整合測試

執行特定測試：
```bash
npm test -- FlexibleAngleMatcher
```

## 配置選項

### V6系統配置
```typescript
const system = new V6System({
  angleTolerance: 5,           // 角度容差（度）
  prioritizeMixedChains: true, // 優先混合零件鏈
  constraints: {
    cuttingLoss: 3,           // 切割損耗（mm）
    frontEndLoss: 10,         // 前端損耗（mm）
    backEndLoss: 10           // 後端損耗（mm）
  }
});
```

## 優化報告

系統會產生詳細的優化報告，包括：
- 輸入摘要（零件數、材料數）
- 優化結果（共刀鏈數、節省材料）
- 排版結果（利用率、虛擬材料）
- 性能指標（處理時間）

## 授權

MIT License