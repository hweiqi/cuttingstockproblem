import { PaginationService } from '../../../utils/PaginationService';
import { PaginationConfig } from '../../../types/pagination';

describe('PaginationService', () => {
  let service: PaginationService<string>;
  
  beforeEach(() => {
    service = new PaginationService<string>();
  });

  describe('paginate', () => {
    const testItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10'];

    it('應該正確分頁第一頁', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      expect(result.items).toEqual(['item1', 'item2', 'item3']);
      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.totalPages).toBe(4);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.hasPrevious).toBe(false);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.startIndex).toBe(0);
      expect(result.pagination.endIndex).toBe(2);
    });

    it('應該正確分頁中間頁', () => {
      const config: PaginationConfig = { currentPage: 2, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      expect(result.items).toEqual(['item4', 'item5', 'item6']);
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.hasPrevious).toBe(true);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.startIndex).toBe(3);
      expect(result.pagination.endIndex).toBe(5);
    });

    it('應該正確分頁最後一頁', () => {
      const config: PaginationConfig = { currentPage: 4, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      expect(result.items).toEqual(['item10']);
      expect(result.pagination.currentPage).toBe(4);
      expect(result.pagination.hasPrevious).toBe(true);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.startIndex).toBe(9);
      expect(result.pagination.endIndex).toBe(9);
    });

    it('應該處理空陣列', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 10 };
      const result = service.paginate([], config);

      expect(result.items).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.hasPrevious).toBe(false);
      expect(result.pagination.hasNext).toBe(false);
    });

    it('應該處理頁碼超出範圍的情況（太大）', () => {
      const config: PaginationConfig = { currentPage: 10, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      // 應該返回最後一頁
      expect(result.items).toEqual(['item10']);
      expect(result.pagination.currentPage).toBe(4);
    });

    it('應該處理頁碼超出範圍的情況（太小）', () => {
      const config: PaginationConfig = { currentPage: 0, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      // 應該返回第一頁
      expect(result.items).toEqual(['item1', 'item2', 'item3']);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('應該處理負數頁碼', () => {
      const config: PaginationConfig = { currentPage: -5, itemsPerPage: 3 };
      const result = service.paginate(testItems, config);

      // 應該返回第一頁
      expect(result.items).toEqual(['item1', 'item2', 'item3']);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('應該處理無效的每頁項目數', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 0 };
      const result = service.paginate(testItems, config);

      // 應該使用預設值（如10）
      expect(result.items).toEqual(testItems); // 全部項目
      expect(result.pagination.itemsPerPage).toBe(10);
    });

    it('應該處理負數的每頁項目數', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: -5 };
      const result = service.paginate(testItems, config);

      // 應該使用預設值
      expect(result.pagination.itemsPerPage).toBe(10);
    });

    it('應該正確處理恰好整除的情況', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f'];
      const config: PaginationConfig = { currentPage: 2, itemsPerPage: 3 };
      const result = service.paginate(items, config);

      expect(result.items).toEqual(['d', 'e', 'f']);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('createPaginationCallbacks', () => {
    const items = Array.from({ length: 20 }, (_, i) => `item${i + 1}`);
    
    it('應該正確執行goToPage', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.goToPage(3);
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 3,
        itemsPerPage: 5
      }));
    });

    it('應該正確執行nextPage', () => {
      const config: PaginationConfig = { currentPage: 2, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.nextPage();
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 3,
        itemsPerPage: 5
      }));
    });

    it('應該在最後一頁時不執行nextPage', () => {
      const config: PaginationConfig = { currentPage: 4, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.nextPage();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('應該正確執行previousPage', () => {
      const config: PaginationConfig = { currentPage: 3, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.previousPage();
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 2,
        itemsPerPage: 5
      }));
    });

    it('應該在第一頁時不執行previousPage', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.previousPage();
      expect(onPageChange).not.toHaveBeenCalled();
    });

    it('應該正確執行firstPage', () => {
      const config: PaginationConfig = { currentPage: 3, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.firstPage();
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 1,
        itemsPerPage: 5
      }));
    });

    it('應該正確執行lastPage', () => {
      const config: PaginationConfig = { currentPage: 1, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.lastPage();
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 4,
        itemsPerPage: 5
      }));
    });

    it('應該正確執行changeItemsPerPage', () => {
      const config: PaginationConfig = { currentPage: 3, itemsPerPage: 5 };
      const onPageChange = jest.fn();
      const callbacks = service.createPaginationCallbacks(items, config, onPageChange);

      callbacks.changeItemsPerPage(10);
      expect(onPageChange).toHaveBeenCalledWith(expect.objectContaining({
        currentPage: 1, // 應該重置到第一頁
        itemsPerPage: 10
      }));
    });
  });

  describe('calculatePageRange', () => {
    it('應該計算正確的頁碼範圍（頁數少於最大顯示數）', () => {
      const result = service.calculatePageRange(3, 5, 7);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('應該計算正確的頁碼範圍（當前頁在開始）', () => {
      const result = service.calculatePageRange(2, 10, 5);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('應該計算正確的頁碼範圍（當前頁在中間）', () => {
      const result = service.calculatePageRange(5, 10, 5);
      expect(result).toEqual([3, 4, 5, 6, 7]);
    });

    it('應該計算正確的頁碼範圍（當前頁在結尾）', () => {
      const result = service.calculatePageRange(9, 10, 5);
      expect(result).toEqual([6, 7, 8, 9, 10]);
    });

    it('應該處理只有一頁的情況', () => {
      const result = service.calculatePageRange(1, 1, 5);
      expect(result).toEqual([1]);
    });
  });
});