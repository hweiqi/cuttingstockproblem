# 切割排版系統文件索引

本資料夾包含切割排版系統的所有相關文件，依照類別分組整理。

## 📁 文件結構

### 📘 system/ - 系統架構與設計文件
- **SYSTEM_DOCUMENTATION.md** - 完整的系統文件，包含：
  - 系統概述與規格
  - V6 優化引擎特點
  - 系統架構說明
  - 核心組件與服務層介紹
  - 工作流程與優化策略
  - 技術棧與部署說明

- **v6-architecture.md** - V6 共刀系統架構設計，包含：
  - 核心改進說明
  - 模組結構圖
  - 靈活角度匹配系統
  - 動態共刀鏈構建
  - 關鍵技術特點與配置

### 📊 optimization/ - 效能優化相關文件
- **PERFORMANCE_OPTIMIZATION_GUIDE.md** - 完整的效能優化指南，包含：
  - 優化背景與問題分析
  - 詳細的優化方案與實作
  - 實作指南與整合步驟
  - 效能測試結果
  - 已知問題與修復方案
  - 使用指南與疑難排解
  - 未來優化方向

### 🔍 problem/ - 問題描述與分析文件
- **original-problem.md** - 原始問題描述，包含：
  - 切割排版問題的業務需求
  - 功能規格說明
  - 限制條件

- **unsolved-problem.md** - 優化歷程與當前狀態，包含：
  - 已解決的問題清單
  - 效能測試結果
  - 剩餘待處理的問題
  - 改進建議

### 📈 reports/ - 分析報告
- **total-materials-analysis.md** - 材料使用分析報告

## 🗺️ 閱讀指南

### 新手入門
1. 先閱讀 `problem/original-problem.md` 了解業務需求
2. 再閱讀 `system/SYSTEM_DOCUMENTATION.md` 了解系統架構
3. 查看 `system/v6-architecture.md` 了解最新架構設計

### 開發人員
1. 閱讀 `system/SYSTEM_DOCUMENTATION.md` 了解技術架構
2. 參考 `optimization/PERFORMANCE_OPTIMIZATION_GUIDE.md` 了解優化技術
3. 查看 `system/v6-architecture.md` 了解實際配置

### 維護人員
1. 查看 `problem/unsolved-problem.md` 了解當前系統狀態
2. 參考 `optimization/PERFORMANCE_OPTIMIZATION_GUIDE.md` 了解效能瓶頸
3. 閱讀 `reports/total-materials-analysis.md` 了解材料使用情況

## 🚀 系統現況

### 主要成就
- ✅ 實現 V6 優化引擎，支援靈活角度匹配和動態共刀鏈
- ✅ 優化共刀匹配計算，從 O(n²) 降至 O(n)
- ✅ 實現 Web Worker 支援，避免 UI 阻塞
- ✅ 新增進度顯示和時間估算功能
- ✅ 優化報告生成服務

### 效能指標
- 50,000 零件測試：3-5 分鐘內完成
- 排版率：>90%（一般場景）
- 材料利用率：>60%

### 核心技術
- 哈希表優化的角度匹配
- 延遲展開的鏈構建策略
- 自適應批次處理
- 智能材料實例管理

## 📝 文件維護說明

- 所有文件使用 Markdown 格式
- 文件更新時請同步更新此索引
- 新增文件請按照類別放置在對應資料夾
- 文件命名使用小寫字母和連字號（kebab-case）

## 🔄 最後更新

- 系統版本：V6.1.0
- 更新日期：2025-07-31
- 維護者：Claude AI Assistant