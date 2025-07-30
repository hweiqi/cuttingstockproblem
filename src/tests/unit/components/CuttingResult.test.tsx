import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CuttingResult } from '../../../components/CuttingResult';
import { CuttingResult as CuttingResultType } from '../../../types';

describe('CuttingResult Component', () => {
  const mockResultBase: CuttingResultType = {
    cutPlans: [],
    totalMaterialsUsed: 0,
    totalWaste: 0,
    overallEfficiency: 0,
    executionTime: 100,
    unplacedParts: [],
    totalParts: 0,
    placedParts: 0,
    averageUtilization: 0,
    warnings: []
  };

  describe('處理 undefined 或空的 cutPlans', () => {
    it('應該正確處理 undefined cutPlans', () => {
      const resultWithUndefinedCutPlans = {
        ...mockResultBase,
        cutPlans: undefined as any
      };

      const { container } = render(
        <CuttingResult result={resultWithUndefinedCutPlans} cuttingLoss={3} />
      );

      // 應該顯示 "沒有生成任何排版方案" 訊息
      expect(screen.getByText('沒有生成任何排版方案')).toBeInTheDocument();
      
      // 不應該出現錯誤
      expect(container.querySelector('.error-message')).not.toBeInTheDocument();
    });

    it('應該正確處理空的 cutPlans 陣列', () => {
      const resultWithEmptyCutPlans = {
        ...mockResultBase,
        cutPlans: []
      };

      render(
        <CuttingResult result={resultWithEmptyCutPlans} cuttingLoss={3} />
      );

      // 應該顯示 "沒有生成任何排版方案" 訊息
      expect(screen.getByText('沒有生成任何排版方案')).toBeInTheDocument();
    });

    it('應該正確處理 null result', () => {
      const { container } = render(
        <CuttingResult result={null} cuttingLoss={3} />
      );

      // 應該不渲染任何內容
      expect(container.firstChild).toBeNull();
    });
  });

  describe('正常顯示排版結果', () => {
    it('應該正確顯示有排版方案的結果', () => {
      const resultWithCutPlans: CuttingResultType = {
        ...mockResultBase,
        cutPlans: [
          {
            materialId: 'mat1',
            materialLength: 6000,
            parts: [
              {
                partId: 'part1',
                length: 2000,
                position: 10,
                isSharedCut: false
              },
              {
                partId: 'part2',
                length: 3000,
                position: 2013,
                isSharedCut: false
              }
            ],
            cuts: [
              {
                partId: 'part1',
                position: 10,
                length: 2000,
                isSharedCut: false
              },
              {
                partId: 'part2',
                position: 2013,
                length: 3000,
                isSharedCut: false
              }
            ],
            wasteLength: 987,
            efficiency: 83.55,
            utilization: 0.8355,
            waste: 987
          }
        ],
        totalMaterialsUsed: 1,
        totalWaste: 987,
        overallEfficiency: 83.55,
        executionTime: 150,
        totalParts: 2,
        placedParts: 2
      };

      render(
        <CuttingResult result={resultWithCutPlans} cuttingLoss={3} />
      );

      // 應該顯示結果摘要
      expect(screen.getByText('使用母材數量:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // 應該顯示排版方案標題
      expect(screen.getByText('詳細排版方案')).toBeInTheDocument();
      
      // 應該顯示母材資訊
      expect(screen.getByText(/母材 #1/)).toBeInTheDocument();
      
      // 不應該顯示 "沒有生成任何排版方案"
      expect(screen.queryByText('沒有生成任何排版方案')).not.toBeInTheDocument();
    });

    it('應該正確顯示共刀優化資訊', () => {
      const resultWithSharedCuts: CuttingResultType = {
        ...mockResultBase,
        cutPlans: [
          {
            materialId: 'mat1',
            materialLength: 6000,
            parts: [
              {
                partId: 'part1',
                length: 2000,
                position: 10,
                isSharedCut: true,
                sharedWith: 'part2',
                angleSavings: 50
              }
            ],
            cuts: [
              {
                partId: 'part1',
                position: 10,
                length: 2000,
                isSharedCut: true,
                sharedWith: 'part2',
                angleSavings: 50
              }
            ],
            wasteLength: 500,
            efficiency: 91.67,
            utilization: 0.9167,
            waste: 500
          }
        ],
        sharedCuttingInfo: {
          totalSharedCuts: 1,
          totalSavings: 50
        }
      };

      render(
        <CuttingResult result={resultWithSharedCuts} cuttingLoss={3} />
      );

      // 應該顯示共刀優化摘要
      expect(screen.getByText('共刀優化摘要')).toBeInTheDocument();
      expect(screen.getByText('共刀切割數:')).toBeInTheDocument();
      expect(screen.getByText('【共刀】')).toBeInTheDocument();
    });
  });

  describe('分頁功能', () => {
    it('應該在有多個排版方案時顯示分頁控制', () => {
      const manyPlans = Array.from({ length: 15 }, (_, i) => ({
        materialId: `mat${i}`,
        materialLength: 6000,
        parts: [],
        cuts: [],
        wasteLength: 100,
        efficiency: 98.33,
        utilization: 0.9833,
        waste: 100
      }));

      const resultWithManyPlans: CuttingResultType = {
        ...mockResultBase,
        cutPlans: manyPlans,
        totalMaterialsUsed: 15
      };

      render(
        <CuttingResult result={resultWithManyPlans} cuttingLoss={3} />
      );

      // 應該顯示分頁控制（因為有15個方案，超過預設的10個每頁）
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('應該在排版方案少於每頁數量時不顯示分頁', () => {
      const fewPlans = Array.from({ length: 5 }, (_, i) => ({
        materialId: `mat${i}`,
        materialLength: 6000,
        parts: [],
        cuts: [],
        wasteLength: 100,
        efficiency: 98.33,
        utilization: 0.9833,
        waste: 100
      }));

      const resultWithFewPlans: CuttingResultType = {
        ...mockResultBase,
        cutPlans: fewPlans,
        totalMaterialsUsed: 5
      };

      const { container } = render(
        <CuttingResult result={resultWithFewPlans} cuttingLoss={3} />
      );

      // 不應該顯示分頁控制
      expect(container.querySelector('nav')).not.toBeInTheDocument();
    });
  });

  describe('處理異常數值', () => {
    it('應該正確處理 NaN 和 undefined 數值', () => {
      const resultWithBadValues: CuttingResultType = {
        ...mockResultBase,
        cutPlans: [
          {
            materialId: 'mat1',
            materialLength: 6000,
            parts: [],
            cuts: [],
            wasteLength: NaN,
            efficiency: undefined as any,
            utilization: undefined,
            waste: undefined
          }
        ],
        totalWaste: NaN,
        overallEfficiency: undefined as any,
        averageUtilization: NaN
      };

      render(
        <CuttingResult result={resultWithBadValues} cuttingLoss={3} />
      );

      // 應該能正常渲染，不會崩潰
      expect(screen.getByText('排版結果')).toBeInTheDocument();
      expect(screen.getByText('詳細排版方案')).toBeInTheDocument();
    });
  });

  describe('處理大量資料', () => {
    it('應該能處理 50000 個零件的結果', () => {
      // 模擬 50000 個零件分佈在多個材料上
      const largePlans = Array.from({ length: 5000 }, (_, i) => ({
        materialId: `mat${i}`,
        materialLength: 6000,
        parts: Array.from({ length: 10 }, (_, j) => ({
          partId: `part${i * 10 + j}`,
          length: 500,
          position: j * 550,
          isSharedCut: false
        })),
        cuts: Array.from({ length: 10 }, (_, j) => ({
          partId: `part${i * 10 + j}`,
          position: j * 550,
          length: 500,
          isSharedCut: false
        })),
        wasteLength: 500,
        efficiency: 91.67,
        utilization: 0.9167,
        waste: 500
      }));

      const largeResult: CuttingResultType = {
        ...mockResultBase,
        cutPlans: largePlans,
        totalMaterialsUsed: 5000,
        totalParts: 50000,
        placedParts: 50000
      };

      render(
        <CuttingResult result={largeResult} cuttingLoss={3} />
      );

      // 應該能正常渲染並顯示分頁
      expect(screen.getByText('排版結果')).toBeInTheDocument();
      expect(screen.getByText('使用母材數量:')).toBeInTheDocument();
      expect(screen.getByText('5000')).toBeInTheDocument();
      
      // 應該有分頁控制
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });
});