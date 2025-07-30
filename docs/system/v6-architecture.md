# V6 共刀系統架構設計

## 核心改進

### 1. 靈活的角度匹配系統
- 不再要求角度完全相同
- 支援角度容差（如32度和35度可以共刀）
- 支援不同位置的角度匹配（如A的左上角可以和B的右上角共刀）
- 使用哈希表分組優化，將時間複雜度從 O(n²) 降至 O(n)

### 2. 動態共刀鏈構建
- 共刀鏈可以包含多種不同的零件
- 支援複雜的共刀組合（如A-B-A-C-B）
- 使用延遲展開和批次處理來控制記憶體使用
- 自動尋找最優的共刀組合

### 3. 優化排版保證
- 確保所有零件都被排版
- 自適應批次處理策略
- 智能材料實例管理
- 優先考慮共刀優化，但不犧牲排版完整性

## 實際模組結構

```
v6/
├── models/
│   ├── Part.ts          # 零件模型（包含 PartWithQuantity）
│   ├── Material.ts      # 材料模型（包含 PlacementResult）
│   ├── SharedCut.ts     # 共刀定義
│   └── Chain.ts         # 共刀鏈模型
├── matching/
│   ├── FlexibleAngleMatcher.ts      # 基礎角度匹配器
│   └── OptimizedFlexibleAngleMatcher.ts # 優化角度匹配器（哈希表）
├── optimization/
│   ├── DynamicChainBuilder.ts       # 基礎鏈構建器
│   ├── OptimizedChainBuilder.ts     # 優化鏈構建器（實際使用）
│   └── OptimizedDynamicChainBuilder.ts # 進階鏈構建器（備用）
├── system/
│   └── V6System.ts      # 完整系統整合
└── ../../placement/
    ├── OptimizedPlacerV2.ts         # 基礎排版器
    ├── OptimizedPlacerV4.ts         # 進階排版器（實際使用）
    └── OptimizedMaterialManagerV2.ts # 智能材料管理器
```

## V6System 實際配置

```typescript
export class V6System {
  private matcher: OptimizedFlexibleAngleMatcher;    // 哈希表優化匹配
  private chainBuilder: OptimizedChainBuilder;       // 延遲展開鏈構建
  private placer: OptimizedPlacerV4;                 // 自適應批次排版
  
  constructor(config?: V6SystemConfig) {
    this.config = {
      angleTolerance: 5,              // 預設角度容差
      maxChainSize: 50,              // 最大鏈大小
      prioritizeMixedChains: true,   // 優先混合鏈
      ...config
    };

    this.matcher = new OptimizedFlexibleAngleMatcher(this.config.angleTolerance);
    this.chainBuilder = new OptimizedChainBuilder(this.config.angleTolerance);
    this.placer = new OptimizedPlacerV4(this.config.constraints);
  }
}
```

## 關鍵技術特點

### 1. OptimizedFlexibleAngleMatcher
- **哈希表分組**：按角度分組預處理，避免重複比對
- **量化角度**：將相近角度歸為同一組
- **早期終止**：當找到足夠匹配時提前結束搜索

### 2. OptimizedChainBuilder
- **延遲展開**：只在需要時才展開零件實例
- **批次處理**：分批處理大量零件避免記憶體溢出
- **限制策略**：
  - 最大鏈大小：50
  - 最大鏈長度：14,950mm
  - 最大總鏈數：4,500
  - 同時處理零件類型：1,000
  - 批次處理閾值：100

### 3. OptimizedPlacerV4
- **自適應批次**：根據成功率動態調整批次大小（50-2000）
- **智能材料創建**：根據需求動態創建材料實例
- **失敗重試**：連續失敗時調整策略

### 4. OptimizedMaterialManagerV2
- **智能初始化**：計算實際需要的材料實例數量
- **動態擴展**：根據排版需求動態增加實例
- **記憶體控制**：避免創建過多不必要的實例

## 工作流程

### 1. 角度匹配階段
```typescript
// 哈希表預分組
const angleGroups = this.matcher.groupPartsByAngles(parts);

// 快速匹配
const matches = this.matcher.findMatchesFromGroups(angleGroups);
```

### 2. 鏈構建階段
```typescript
// 延遲展開處理
const batchedParts = this.prepareBatchedParts(parts);

// 批次構建鏈
const chains = this.buildChainsInBatches(batchedParts);
```

### 3. 排版階段
```typescript
// 自適應批次處理
let batchSize = this.INITIAL_BATCH_SIZE;
while (hasUnplacedParts) {
  const batch = this.createBatch(unplacedParts, batchSize);
  const result = this.processBatch(batch);
  batchSize = this.adjustBatchSize(result.successRate);
}
```

## 配置參數

### 系統層級配置
```typescript
interface V6SystemConfig {
  angleTolerance?: number;           // 角度容差（預設：5°）
  maxChainSize?: number;            // 最大鏈大小（預設：50）
  prioritizeMixedChains?: boolean;  // 優先混合鏈（預設：true）
  constraints?: {
    cuttingLoss?: number;           // 切割損耗（預設：3mm）
    frontEndLoss?: number;          // 前端損耗（預設：10mm）
    backEndLoss?: number;           // 後端損耗（預設：0mm）
  };
}
```

### 效能相關配置
```typescript
// OptimizedChainBuilder 配置
private readonly MAX_CHAIN_SIZE = 50;
private readonly MAX_CHAINS = 4500;
private readonly MAX_PROCESSING_PARTS = 1000;
private readonly BATCH_PROCESSING_THRESHOLD = 100;

// OptimizedPlacerV4 配置
private readonly MIN_BATCH_SIZE = 50;
private readonly MAX_BATCH_SIZE = 2000;
private readonly INITIAL_BATCH_SIZE = 200;
```

## 效能優化成果

- **角度匹配**：從 O(n²) 降至 O(n)
- **記憶體使用**：透過延遲展開和批次處理大幅降低
- **排版成功率**：從 1.33% 提升至 90%+
- **材料實例管理**：從固定少量提升至智能動態創建

---

*本文件反映 V6 系統的實際架構和實作細節*
*最後更新：2025-07-29*