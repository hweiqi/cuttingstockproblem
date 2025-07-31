# 總材料數 (totalMaterials) 分析報告

## 一、總材料數的含義

在優化報告中，「總材料數」有兩個不同的含義，取決於它出現的位置：

### 1. 輸入摘要中的「總材料數」
- **位置**：`report.totalMaterials`
- **含義**：用戶輸入的**材料種類數量**
- **計算方式**：`materials.length`
- **例子**：如果用戶輸入了 3 種材料（6000mm、8000mm、10000mm），總材料數就是 3

### 2. 實際使用的「使用材料數」
- **位置**：`totalMaterialsUsed`
- **含義**：實際用於排版的**材料實例總數**
- **計算方式**：`cutPlans.length` 或 `usedMaterials.length`
- **例子**：即使只有 3 種材料，但可能使用了 10 個實例（如：6000mm 用了 5 個，8000mm 用了 3 個，10000mm 用了 2 個）

## 二、計算流程

### 1. 初始階段（材料種類）
```typescript
// 在 OptimizedPlacerV4.ts 中
report: {
  totalMaterials: materials.length,  // 這是材料種類數
  // ...
}
```

### 2. 材料實例創建
```typescript
// OptimizedMaterialManagerV2.createMaterialInstances()
// 根據零件需求，為每種材料創建多個實例
for (const material of sortedMaterials) {
  const estimatedCount = this.estimateRequiredInstancesForItems(material, bestFitItems);
  for (let i = 0; i < actualCount; i++) {
    instances.push({
      material,
      instanceId: currentMaterialInstances + i,
      usedLength: 0
    });
  }
}
```

### 3. 最終報告階段
```typescript
// 在成功排版後
report: {
  totalMaterials: materialInstances.length,  // 這是實際創建的實例數
  // ...
}
```

## 三、兩個數值的差異

| 指標 | 輸入摘要的總材料數 | 使用材料數 |
|------|-------------------|------------|
| 含義 | 材料種類數量 | 實際使用的材料實例數 |
| 計算來源 | `materials.length` | `materialInstances.length` 或 `cutPlans.length` |
| 代表意義 | 可選擇的材料規格數 | 實際消耗的材料數量 |
| 示例 | 3（3種規格） | 10（10根材料） |

## 四、系統設計邏輯

1. **無限供應模式**：系統設計為材料無數量限制（`quantity: 0`），會根據需要自動創建實例

2. **動態實例創建**：
   - 初始根據零件需求估算需要的實例數
   - 如果不夠，會通過「積極策略」創建更多實例
   - 最終報告顯示實際使用的實例數

3. **報告中的混淆**：
   - 同一個字段 `totalMaterials` 在不同階段有不同含義
   - 在輸入階段代表種類數，在結果階段代表實例數

## 五、建議改進

為了避免混淆，建議將報告結構修改為：

```typescript
interface PlacementReport {
  totalParts: number;
  materialTypes: number;        // 材料種類數（原 totalMaterials）
  materialInstancesUsed: number; // 實際使用的材料實例數
  // ...
}
```

這樣可以清楚區分：
- `materialTypes`：有幾種不同規格的材料可選
- `materialInstancesUsed`：實際使用了多少根材料