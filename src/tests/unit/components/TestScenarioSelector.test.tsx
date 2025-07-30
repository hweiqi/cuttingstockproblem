import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestScenarioSelector } from '../../../components/TestScenarioSelector';
import { Part, Material } from '../../../types';

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe('TestScenarioSelector', () => {
  let mockOnApplyScenario: jest.Mock;

  beforeEach(() => {
    mockOnApplyScenario = jest.fn();
    (global.confirm as jest.Mock).mockClear();
  });

  test('應該正確渲染測試場景按鈕', () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    const button = screen.getByRole('button', { name: /測試場景/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', '快速載入測試數據');
  });

  test('點擊按鈕應該顯示下拉選單', () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    // 檢查各個區塊是否顯示
    expect(screen.getByText('隨機場景')).toBeInTheDocument();
    expect(screen.getByText('大規模測試場景')).toBeInTheDocument();
    expect(screen.getByText('預設場景')).toBeInTheDocument();
  });

  test('應該有效能測試 (50,000支) 按鈕', () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    const performanceTestBtn = screen.getByText('效能測試 (50,000支)');
    expect(performanceTestBtn).toBeInTheDocument();
    
    const description = screen.getByText('標準效能測試場景');
    expect(description).toBeInTheDocument();
  });

  test('點擊效能測試按鈕應該顯示確認對話框', async () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    // 開啟下拉選單
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    // 點擊效能測試按鈕
    const performanceTestBtn = screen.getByText('效能測試 (50,000支)');
    fireEvent.click(performanceTestBtn);
    
    // 檢查確認對話框是否被呼叫
    expect(global.confirm).toHaveBeenCalledWith(
      '這將生成 50000 支零件的效能測試場景，用於標準效能測試。是否繼續？'
    );
  });

  test('確認後應該呼叫 onApplyScenario', async () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    // 開啟下拉選單
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    // 點擊效能測試按鈕
    const performanceTestBtn = screen.getByText('效能測試 (50,000支)');
    fireEvent.click(performanceTestBtn);
    
    // 等待 onApplyScenario 被呼叫
    await waitFor(() => {
      expect(mockOnApplyScenario).toHaveBeenCalled();
    });
    
    // 檢查傳遞的參數
    const [parts, materials] = mockOnApplyScenario.mock.calls[0];
    expect(parts).toHaveLength(50000);
    expect(Array.isArray(materials)).toBe(true);
  });

  test('取消確認對話框不應該載入場景', async () => {
    (global.confirm as jest.Mock).mockReturnValueOnce(false);
    
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    // 開啟下拉選單
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    // 點擊效能測試按鈕
    const performanceTestBtn = screen.getByText('效能測試 (50,000支)');
    fireEvent.click(performanceTestBtn);
    
    // 確認 onApplyScenario 沒有被呼叫
    expect(mockOnApplyScenario).not.toHaveBeenCalled();
  });

  test('所有大規模測試按鈕都應該存在', () => {
    render(<TestScenarioSelector onApplyScenario={mockOnApplyScenario} />);
    
    const button = screen.getByRole('button', { name: /測試場景/i });
    fireEvent.click(button);
    
    // 檢查三個大規模測試按鈕
    expect(screen.getByText('大規模 (10,000支)')).toBeInTheDocument();
    expect(screen.getByText('效能測試 (50,000支)')).toBeInTheDocument();
    expect(screen.getByText('終極規模 (100,000支)')).toBeInTheDocument();
  });
});