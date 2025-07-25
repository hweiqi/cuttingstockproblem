# 切割優化系統業務邏輯

## 共刀（Shared Cutting）邏輯詳解

### 1. 共刀概念說明

共刀是一種優化切割工藝，當兩個零件的相鄰邊具有相同角度時，可以通過一次切割同時完成兩個零件的該邊加工，從而節省材料和加工時間。

### 2. 角度定義與位置

每個零件可以有四個角度位置：
```
  topLeft -------- topRight
    |                |
    |                |
    |                |
  bottomLeft --- bottomRight
```

角度值範圍：0° ~ 90°（不包含90°）
- 0° 表示該位置無角度（直角）
- 大於 0° 表示該位置有斜切角度

### 3. 角度匹配規則

#### 3.1 基本匹配條件
兩個零件可以共刀的條件：
1. 至少有一個位置的角度相同（或在容差範圍內）
2. 角度必須大於 0°（0° 表示無角度，不能共刀）

#### 3.2 角度容差
系統支援角度容差匹配（預設 ±5°）：
- 如果兩個角度的差異在容差範圍內，視為可匹配
- 例如：45° 和 48° 在 ±5° 容差下可以匹配

#### 3.3 跨位置匹配
V6 系統支援不同位置間的角度匹配：
- topLeft 可以與 topRight、bottomLeft、bottomRight 匹配
- 只要角度相同（或在容差內），不限制位置組合

### 4. 共刀節省計算

#### 4.1 節省量計算公式
```typescript
savings = Math.sin(sharedAngle * Math.PI / 180) * minThickness
```

其中：
- `sharedAngle`：共享的角度值（度）
- `minThickness`：兩個零件中較小的厚度值
- 如果零件未定義厚度，預設使用 10mm

#### 4.2 計算範例
- 兩個零件都有 45° 角，厚度為 10mm
- 節省量 = sin(45°) × 10 = 0.707 × 10 = 7.07mm

### 5. 共刀鏈（Shared Cut Chain）

#### 5.1 鏈的概念
多個零件可以形成共刀鏈，實現連續的共刀優化：
```
零件A --共刀--> 零件B --共刀--> 零件C
```

#### 5.2 鏈的類型
- **同質鏈**：鏈中所有零件類型相同
- **混合鏈**：鏈中包含不同類型的零件（V6 系統優先建立混合鏈）

#### 5.3 鏈的建立策略
1. 優先建立節省量大的連接
2. 優先建立混合零件鏈（提高材料利用率）
3. 限制最大鏈長度（預設 50 個零件）

### 6. 實際排版中的共刀處理

#### 6.1 排版順序
共刀鏈中的零件必須連續排列在同一材料上，以實現共刀效果。

#### 6.2 位置計算
```typescript
// 第一個零件正常放置
position1 = currentPosition

// 第二個零件位置 = 第一個零件結束位置 - 共刀節省量
position2 = position1 + part1.length - sharedCutSavings
```

#### 6.3 切割損耗處理
- 共刀的零件之間沒有切割損耗
- 非共刀的零件之間需要加上切割損耗（預設 5mm）

### 7. 共刀優化的業務價值

1. **材料節省**：減少材料浪費，每個共刀連接可節省 5-15mm
2. **加工效率**：減少切割次數，提高生產效率
3. **成本降低**：材料和加工時間的雙重節省

### 8. 系統實現特點

#### 8.1 V6 系統優勢
- 支援角度容差匹配（更靈活）
- 支援跨位置匹配（更多共刀機會）
- 優先混合零件鏈（更高材料利用率）
- 100% 排版保證（必要時使用虛擬材料）

#### 8.2 限制條件
- 左側不能同時有上下角度（topLeft 和 bottomLeft 不能同時 > 0）
- 右側不能同時有上下角度（topRight 和 bottomRight 不能同時 > 0）
- 這是基於實際製造工藝的限制

### 9. 共刀效果展示

在系統介面中，共刀的零件會顯示：
- 共刀標記：【共刀】
- 配對資訊：顯示與哪個零件共刀
- 節省量：顯示具體節省的材料長度
- 視覺標識：共刀零件之間的連接線或特殊顏色

### 10. 最佳實踐建議

1. **設計階段**：盡量設計相同或相近角度的零件
2. **下料規劃**：將有相同角度的零件集中生產
3. **參數設定**：根據加工精度適當調整角度容差
4. **批量優化**：大批量生產時共刀效果更顯著