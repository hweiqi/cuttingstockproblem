/**
 * 分頁系統相關型別定義
 */

/**
 * 分頁配置
 */
export interface PaginationConfig {
  /** 每頁顯示的項目數量 */
  itemsPerPage: number;
  /** 當前頁碼（從1開始） */
  currentPage: number;
}

/**
 * 分頁資訊
 */
export interface PaginationInfo {
  /** 總項目數 */
  totalItems: number;
  /** 總頁數 */
  totalPages: number;
  /** 當前頁碼 */
  currentPage: number;
  /** 每頁項目數 */
  itemsPerPage: number;
  /** 當前頁的起始索引 */
  startIndex: number;
  /** 當前頁的結束索引 */
  endIndex: number;
  /** 是否有上一頁 */
  hasPrevious: boolean;
  /** 是否有下一頁 */
  hasNext: boolean;
}

/**
 * 分頁結果
 */
export interface PaginatedResult<T> {
  /** 當前頁的資料 */
  items: T[];
  /** 分頁資訊 */
  pagination: PaginationInfo;
}

/**
 * 分頁控制回調函數
 */
export interface PaginationCallbacks {
  /** 跳轉到指定頁 */
  goToPage: (page: number) => void;
  /** 下一頁 */
  nextPage: () => void;
  /** 上一頁 */
  previousPage: () => void;
  /** 第一頁 */
  firstPage: () => void;
  /** 最後一頁 */
  lastPage: () => void;
  /** 改變每頁項目數 */
  changeItemsPerPage: (itemsPerPage: number) => void;
}