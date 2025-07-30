import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Pagination } from '../../../components/Pagination';
import { PaginationInfo } from '../../../types/pagination';

describe('Pagination Component', () => {
  const mockOnPageChange = jest.fn();
  const defaultPaginationInfo: PaginationInfo = {
    totalItems: 100,
    totalPages: 10,
    currentPage: 5,
    itemsPerPage: 10,
    startIndex: 40,
    endIndex: 49,
    hasPrevious: true,
    hasNext: true
  };

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  describe('基本渲染', () => {
    it('應該正確渲染分頁資訊', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      // 檢查顯示資訊
      expect(screen.getByText(/顯示 41-50 筆，共 100 筆/i)).toBeInTheDocument();
      expect(screen.getByText(/第 5 頁，共 10 頁/i)).toBeInTheDocument();
    });

    it('應該正確顯示頁碼按鈕', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      // 預設應該顯示當前頁附近的5個頁碼
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('應該高亮當前頁碼', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      const currentPageButton = screen.getByText('5');
      expect(currentPageButton).toHaveClass('active');
    });
  });

  describe('導航功能', () => {
    it('點擊頁碼應該觸發onPageChange', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.click(screen.getByText('7'));
      expect(mockOnPageChange).toHaveBeenCalledWith(7);
    });

    it('點擊首頁按鈕應該跳到第一頁', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.click(screen.getByTitle('第一頁'));
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('點擊上一頁按鈕應該跳到前一頁', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.click(screen.getByTitle('上一頁'));
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    it('點擊下一頁按鈕應該跳到下一頁', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.click(screen.getByTitle('下一頁'));
      expect(mockOnPageChange).toHaveBeenCalledWith(6);
    });

    it('點擊最後頁按鈕應該跳到最後一頁', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      fireEvent.click(screen.getByTitle('最後一頁'));
      expect(mockOnPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('邊界情況', () => {
    it('在第一頁時應該禁用首頁和上一頁按鈕', () => {
      const firstPageInfo: PaginationInfo = {
        ...defaultPaginationInfo,
        currentPage: 1,
        hasPrevious: false,
        hasNext: true
      };

      render(
        <Pagination 
          paginationInfo={firstPageInfo}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByTitle('第一頁')).toBeDisabled();
      expect(screen.getByTitle('上一頁')).toBeDisabled();
    });

    it('在最後一頁時應該禁用下一頁和最後頁按鈕', () => {
      const lastPageInfo: PaginationInfo = {
        ...defaultPaginationInfo,
        currentPage: 10,
        hasPrevious: true,
        hasNext: false
      };

      render(
        <Pagination 
          paginationInfo={lastPageInfo}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByTitle('下一頁')).toBeDisabled();
      expect(screen.getByTitle('最後一頁')).toBeDisabled();
    });

    it('只有一頁時應該禁用所有導航按鈕', () => {
      const singlePageInfo: PaginationInfo = {
        totalItems: 5,
        totalPages: 1,
        currentPage: 1,
        itemsPerPage: 10,
        startIndex: 0,
        endIndex: 4,
        hasPrevious: false,
        hasNext: false
      };

      render(
        <Pagination 
          paginationInfo={singlePageInfo}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByTitle('第一頁')).toBeDisabled();
      expect(screen.getByTitle('上一頁')).toBeDisabled();
      expect(screen.getByTitle('下一頁')).toBeDisabled();
      expect(screen.getByTitle('最後一頁')).toBeDisabled();
    });

    it('沒有資料時應該顯示適當訊息', () => {
      const emptyInfo: PaginationInfo = {
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 10,
        startIndex: 0,
        endIndex: 0,
        hasPrevious: false,
        hasNext: false
      };

      render(
        <Pagination 
          paginationInfo={emptyInfo}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByText(/沒有資料/i)).toBeInTheDocument();
    });
  });

  describe('每頁項目數選擇', () => {
    it('應該顯示每頁項目數選擇器', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
          onItemsPerPageChange={jest.fn()}
          showItemsPerPageSelector={true}
        />
      );

      expect(screen.getByLabelText(/每頁顯示/i)).toBeInTheDocument();
    });

    it('改變每頁項目數應該觸發回調', () => {
      const mockItemsPerPageChange = jest.fn();
      
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
          onItemsPerPageChange={mockItemsPerPageChange}
          showItemsPerPageSelector={true}
        />
      );

      const selector = screen.getByLabelText(/每頁顯示/i) as HTMLSelectElement;
      fireEvent.change(selector, { target: { value: '20' } });
      
      expect(mockItemsPerPageChange).toHaveBeenCalledWith(20);
    });

    it('不傳入onItemsPerPageChange時不應該顯示選擇器', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
          showItemsPerPageSelector={true}
        />
      );

      expect(screen.queryByLabelText(/每頁顯示/i)).not.toBeInTheDocument();
    });
  });

  describe('自定義設定', () => {
    it('應該支援自定義頁碼顯示數量', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
          maxPageButtons={3}
        />
      );

      // 應該只顯示3個頁碼按鈕
      const pageButtons = screen.getAllByRole('button', { name: /第 \d+ 頁/ });
      expect(pageButtons).toHaveLength(3);
    });

    it('應該支援簡約模式', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
          compact={true}
        />
      );

      // 簡約模式下不顯示詳細資訊
      expect(screen.queryByText(/顯示 41-50 筆/i)).not.toBeInTheDocument();
      // 但應該顯示基本的頁碼資訊
      expect(screen.getByText(/5 \/ 10/i)).toBeInTheDocument();
    });
  });

  describe('可訪問性', () => {
    it('應該有適當的ARIA標籤', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', '分頁導航');
    });

    it('當前頁應該有適當的ARIA屬性', () => {
      render(
        <Pagination 
          paginationInfo={defaultPaginationInfo}
          onPageChange={mockOnPageChange}
        />
      );

      const currentPageButton = screen.getByText('5');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });
  });
});