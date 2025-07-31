# 鋼構切割排版系統 V6 - 系統文件

## 📋 系統概述

本系統是一個用於鋼構切割優化的排版系統，採用 V6 優化引擎，具備智能共刀優化功能，能夠自動處理不同位置的角度匹配、混合零件共刀鏈，並確保所有零件都能完成排版。

## 🔧 系統規格

### 1. 母材設定
- 母材僅需設定長度，可以有複數種長度，但設定的長度不可重複
- 母材沒有數量上限，系統會自動創建所需數量的母材實例
- 母材可設定前端切割損耗，為了模擬實際鋼材問題（毛邊、歪斜），預設為 10mm

### 2. 零件設定
- 零件需設定長度、數量、斜切角度
- 可以有複數支零件（不管零件內容是否相同）
- 零件與零件之間會有切割損耗，為了模擬鋸台切割時造成的損耗，預設為 3mm
- 零件厚度用於共刀計算，預設為 20mm

### 3. 排版定義
排版的定義是將所有設定的零件（每支零件的全部數量）都排入母材中，並且盡可能達到將所有零件都以最佳效率進行排版。系統禁止在最一開始就限制母材數量，導致零件未被全部排入母材。

### 4. 共刀功能
透過共刀功能使有斜切角度的零件之間更貼合彼此，以節省耗費母材空間。

## 🎯 V6 優化引擎特點

### 1. 靈活的角度匹配
- 支援角度容差匹配（預設 ±5°）
- 支援不同位置的角度交叉匹配
- 自動處理角度反轉和位置適配

### 2. 動態共刀鏈構建
- 支援混合零件類型的共刀鏈
- 智能分析零件角度相容性
- 動態構建最佳共刀組合

### 3. 優化排版邏輯
- 自適應批次處理
- 確保所有零件都能被排版
- 無限材料供應機制

## 📐 斜切角度與共刀邏輯

### 角度定義
零件具有四個角度位置：
- `topLeft`：左上角角度
- `topRight`：右上角角度
- `bottomLeft`：左下角角度
- `bottomRight`：右下角角度

角度值範圍：0° ~ 90°（不包含90°）
- 0° 表示該位置無角度（直角）
- 大於0° 表示該位置有斜切角度

### 角度限制
- 左側不能同時有上下角度（topLeft 和 bottomLeft 不能同時 > 0）
- 右側不能同時有上下角度（topRight 和 bottomRight 不能同時 > 0）

### 共刀條件
兩個零件可以共刀的條件：
1. 兩個零件都具有角度（非0°）
2. 相鄰邊的角度在容差範圍內匹配
3. 角度匹配符合物理約束

### 共刀節省計算
```
節省量 = sin(共享角度 * π / 180) * min(零件1厚度, 零件2厚度)
```

## 🏗️ 系統架構

### 核心組件

#### 1. V6System (`src/core/v6/system/V6System.ts`)
- 主要的優化引擎
- 協調角度匹配、鏈構建和排版邏輯
- 提供完整的優化報告

**實際配置**：
```typescript
// V6System 實際使用的組件
private matcher: OptimizedFlexibleAngleMatcher;
private chainBuilder: OptimizedChainBuilder;
private placer: OptimizedPlacerV4;
```

#### 2. OptimizedFlexibleAngleMatcher (`src/core/v6/matching/OptimizedFlexibleAngleMatcher.ts`)
- 負責角度匹配和相容性分析
- 支援容差匹配和交叉位置匹配
- 使用哈希表分組優化，將 O(n²) 降至 O(n)
- 量化角度到容差範圍，提升匹配效率

#### 3. OptimizedChainBuilder (`src/core/v6/optimization/OptimizedChainBuilder.ts`)
- 動態構建共刀鏈
- 支援混合零件類型的鏈
- 使用延遲展開和批次處理來處理大量零件

**關鍵配置**：
```typescript
private readonly MAX_CHAIN_SIZE = 50;
private readonly MAX_CHAIN_LENGTH = 15000 - 50;
private readonly MAX_CHAINS = 4500; // 限制總鏈數
private readonly MAX_PROCESSING_PARTS = 1000; // 同時處理的最大零件類型數
private readonly BATCH_PROCESSING_THRESHOLD = 100; // 批次處理的閾值
```

#### 4. OptimizedPlacerV4 (`src/placement/OptimizedPlacerV4.ts`)
- 執行最終的零件排版
- 自適應批次大小處理（50-2000）
- 動態材料實例創建

#### 5. OptimizedMaterialManagerV2 (`src/placement/OptimizedMaterialManagerV2.ts`)
- 智能材料實例管理
- 支援大批量零件的材料實例創建
- 動態擴展機制

### 服務層

#### 1. V6CuttingService (`src/services/V6CuttingService.ts`)
- V6系統的應用介面適配器
- 處理輸入輸出格式轉換
- 預設配置：角度容差 5°，切割損耗 3mm，前端損耗 10mm

#### 2. MaterialService (`src/services/MaterialService.ts`)
- 母材管理服務
- 支援無限材料供應

#### 3. PartService (`src/services/PartService.ts`)
- 零件管理服務
- 自動計算零件厚度

#### 4. OptimizationReportService (`src/services/OptimizationReportService.ts`)
- 優化報告生成服務
- 提供詳細的優化統計資訊

#### 5. TimeEstimationService (`src/services/TimeEstimationService.ts`)
- 時間估算服務
- 根據零件數量和複雜度預估處理時間

### 組件層

#### 1. OptimizedCuttingStockApp (`src/components/OptimizedCuttingStockApp.tsx`)
- 主應用組件
- 整合所有功能
- 支援 Web Worker 和進度顯示

**實際使用狀況**：系統已正確配置使用此優化版組件

#### 2. MaterialInput (`src/components/MaterialInput.tsx`)
- 母材輸入界面

#### 3. PartInput (`src/components/PartInput.tsx`)
- 零件輸入界面

#### 4. CuttingResult (`src/components/CuttingResult.tsx`)
- 結果顯示組件
- 支援分頁顯示大量結果

#### 5. ProgressIndicator (`src/components/ProgressIndicator.tsx`)
- 進度指示器組件
- 顯示優化計算的進度

#### 6. TestScenarioSelector (`src/components/TestScenarioSelector.tsx`)
- 測試場景選擇器
- 支援預設測試案例

## 🔄 工作流程

### 1. 輸入階段
1. 用戶設定母材長度
2. 用戶設定零件（長度、數量、角度）
3. 系統驗證輸入有效性

### 2. 分析階段
1. OptimizedFlexibleAngleMatcher 分析零件角度相容性
2. 評估共刀潛力和可能的節省量

### 3. 優化階段
1. OptimizedChainBuilder 構建最佳共刀鏈
2. 處理混合零件類型的鏈構建
3. 計算每個鏈的節省量

### 4. 排版階段
1. OptimizedPlacerV4 執行排版
2. 使用自適應批次處理
3. 確保所有零件都被排版

### 5. 輸出階段
1. 生成切割計劃
2. 計算材料利用率和浪費量
3. 提供詳細的優化報告

## 📊 優化策略

### 1. 自適應批次處理
- 根據實時成功率調整策略
- 批次大小範圍：50-2000
- 連續失敗時自動減小批次大小

### 2. 智能共刀匹配
- 容差範圍內的角度匹配
- 交叉位置匹配（左對右、右對左）
- 混合零件類型的共刀鏈

### 3. 智能材料管理
- 系統自動創建所需的材料實例
- 大批量零件使用積極的初始實例創建策略
- 動態擴展機制

## 📈 效能指標

### 系統配置
- **角度容差**：預設 ±5°
- **最大鏈大小**：50
- **優先混合鏈**：啟用
- **切割損耗**：3mm
- **前端切割損耗**：10mm

### 處理能力
- **小規模（< 1000 零件）**：毫秒級處理
- **中規模（1000-10000 零件）**：秒級處理
- **大規模（50,000 零件）**：3-5 分鐘內完成
- **排版率**：> 90%（一般場景）
- **材料利用率**：> 60%

## 🧪 測試覆蓋

系統包含完整的測試套件：
- 單元測試：覆蓋所有核心功能
- 整合測試：驗證系統完整性
- 效能測試：確保優化效率

### 測試執行
```bash
npm test              # 執行所有測試
npm run test:watch    # 監視模式
npm run test:coverage # 覆蓋率報告
```

## 🚀 部署和運行

### 開發環境
```bash
npm run dev       # 啟動開發伺服器
```

### 建置
```bash
npm run build     # 建置生產版本
npm start         # 啟動生產伺服器
```

### 程式碼檢查
```bash
npm run lint      # 執行 ESLint 檢查
```

## 📝 維護說明

### 程式碼結構原則
1. 功能分離：各種功能分開至不同文件
2. 相似功能：放置同一文件或同一資料夾
3. TypeScript：使用 TypeScript 語法
4. 測試驅動：遵循 TDD 做法

### 功能修改限制
- 確保不對未提出需要修改的功能進行修改
- 僅可進行程式碼優化，功能必須保持原樣
- 移除過時、已不使用的程式碼時，須確保功能沒有任何變動

## 🔧 技術棧

- **前端框架**：Next.js 15.4.2 + React 19.1.0
- **語言**：TypeScript 5
- **樣式**：styled-jsx
- **測試**：Jest 30.0.5 + Testing Library
- **程式碼品質**：ESLint 9

## 🔍 故障排除

### 常見問題
1. **零件無法排版**：檢查角度設定是否違反限制
2. **共刀失效**：確認角度容差設定是否合理
3. **效能問題**：檢查零件數量是否過多

### 除錯工具
- 瀏覽器開發者工具
- Jest 測試報告
- V6系統優化報告

## 💡 技術亮點

1. **自適應演算法**：根據實時成功率調整策略
2. **智能材料分配**：動態創建所需的材料實例
3. **批次處理**：避免一次性處理過多零件
4. **哈希表優化**：將角度匹配從 O(n²) 降至 O(n)
5. **延遲展開**：減少記憶體使用
6. **進度回饋機制**：提升使用者體驗
7. **Web Worker 支援**：避免 UI 阻塞
8. **分頁顯示**：有效處理大量結果

---

*本文件反映了系統 V6.1.0 版本的實際功能和架構*
*最後更新：2025-07-31*