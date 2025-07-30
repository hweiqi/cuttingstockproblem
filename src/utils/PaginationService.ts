import { 
  PaginationConfig, 
  PaginationInfo, 
  PaginatedResult, 
  PaginationCallbacks 
} from '../types/pagination';

/**
 * 分頁服務
 * 提供通用的分頁邏輯處理
 */
export class PaginationService<T> {
  private readonly DEFAULT_ITEMS_PER_PAGE = 10;
  private readonly MIN_ITEMS_PER_PAGE = 1;
  private readonly MAX_ITEMS_PER_PAGE = 100;

  /**
   * 對資料進行分頁
   * @param items 要分頁的項目陣列
   * @param config 分頁配置
   * @returns 分頁結果，包含當前頁的項目和分頁資訊
   */
  paginate(items: T[], config: PaginationConfig): PaginatedResult<T> {
    // 處理空陣列
    if (items.length === 0) {
      return {
        items: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: config.itemsPerPage || this.DEFAULT_ITEMS_PER_PAGE,
          startIndex: 0,
          endIndex: 0,
          hasPrevious: false,
          hasNext: false
        }
      };
    }

    // 驗證並修正每頁項目數
    let itemsPerPage = config.itemsPerPage;
    if (!itemsPerPage || itemsPerPage <= 0) {
      itemsPerPage = this.DEFAULT_ITEMS_PER_PAGE;
    } else if (itemsPerPage > this.MAX_ITEMS_PER_PAGE) {
      itemsPerPage = this.MAX_ITEMS_PER_PAGE;
    }

    // 計算總頁數
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // 驗證並修正當前頁碼
    let currentPage = config.currentPage;
    if (!currentPage || currentPage < 1) {
      currentPage = 1;
    } else if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    // 計算起始和結束索引
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);

    // 取得當前頁的項目
    const pageItems = items.slice(startIndex, endIndex + 1);

    // 建立分頁資訊
    const pagination: PaginationInfo = {
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage,
      startIndex,
      endIndex,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages
    };

    return {
      items: pageItems,
      pagination
    };
  }

  /**
   * 建立分頁控制回調函數
   * @param items 項目陣列
   * @param config 當前分頁配置
   * @param onPageChange 頁面變更時的回調函數
   * @returns 分頁控制回調函數集合
   */
  createPaginationCallbacks(
    items: T[],
    config: PaginationConfig,
    onPageChange: (newConfig: PaginationConfig) => void
  ): PaginationCallbacks {
    const result = this.paginate(items, config);
    const { pagination } = result;

    return {
      goToPage: (page: number) => {
        if (page >= 1 && page <= pagination.totalPages && page !== config.currentPage) {
          onPageChange({
            ...config,
            currentPage: page
          });
        }
      },

      nextPage: () => {
        if (pagination.hasNext) {
          onPageChange({
            ...config,
            currentPage: config.currentPage + 1
          });
        }
      },

      previousPage: () => {
        if (pagination.hasPrevious) {
          onPageChange({
            ...config,
            currentPage: config.currentPage - 1
          });
        }
      },

      firstPage: () => {
        if (config.currentPage !== 1) {
          onPageChange({
            ...config,
            currentPage: 1
          });
        }
      },

      lastPage: () => {
        if (config.currentPage !== pagination.totalPages) {
          onPageChange({
            ...config,
            currentPage: pagination.totalPages
          });
        }
      },

      changeItemsPerPage: (itemsPerPage: number) => {
        if (itemsPerPage > 0 && itemsPerPage !== config.itemsPerPage) {
          onPageChange({
            currentPage: 1, // 重置到第一頁
            itemsPerPage
          });
        }
      }
    };
  }

  /**
   * 計算顯示的頁碼範圍
   * @param currentPage 當前頁
   * @param totalPages 總頁數
   * @param maxVisible 最大顯示頁碼數
   * @returns 頁碼陣列
   */
  calculatePageRange(currentPage: number, totalPages: number, maxVisible: number = 5): number[] {
    if (totalPages <= maxVisible) {
      // 如果總頁數小於等於最大顯示數，顯示所有頁碼
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // 計算開始和結束頁碼
    const halfVisible = Math.floor(maxVisible / 2);
    let start = currentPage - halfVisible;
    let end = currentPage + halfVisible;

    // 調整邊界
    if (start < 1) {
      start = 1;
      end = Math.min(maxVisible, totalPages);
    } else if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, totalPages - maxVisible + 1);
    }

    // 生成頁碼陣列
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}