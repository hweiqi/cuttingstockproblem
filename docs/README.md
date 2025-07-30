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

- **unsolved-problem.md** - 未解決問題記錄，包含：
  - 尚未解決的技術挑戰
  - 已知的系統限制
  - 未來改進方向

## 🗺️ 閱讀指南

### 新手入門
1. 先閱讀 `problem/original-problem.md` 了解業務需求
2. 再閱讀 `system/SYSTEM_DOCUMENTATION.md` 了解系統架構

### 開發人員
1. 閱讀 `system/SYSTEM_DOCUMENTATION.md` 了解技術架構
2. 參考 `optimization/optimization-implementation-guide.md` 了解優化技術

### 維護人員
1. 查看 `problem/unsolved-problem.md` 了解已知問題
2. 參考 `optimization/performance-optimization-issues.md` 了解效能瓶頸

## 📝 文件維護說明

- 所有文件使用 Markdown 格式
- 文件更新時請同步更新此索引
- 新增文件請按照類別放置在對應資料夾
- 文件命名使用小寫字母和連字號（kebab-case）

## 🔄 最後更新

- 系統版本：V6.0.0
- 更新日期：2025-07-29
- 維護者：Claude AI Assistant