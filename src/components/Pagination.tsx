import React from 'react';
import { PaginationInfo } from '../types/pagination';
import { PaginationService } from '../utils/PaginationService';

interface PaginationProps {
  /** 分頁資訊 */
  paginationInfo: PaginationInfo;
  /** 頁碼變更時的回調函數 */
  onPageChange: (page: number) => void;
  /** 每頁項目數變更時的回調函數（可選） */
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  /** 是否顯示每頁項目數選擇器 */
  showItemsPerPageSelector?: boolean;
  /** 最大顯示頁碼按鈕數量（預設5） */
  maxPageButtons?: number;
  /** 是否使用簡約模式 */
  compact?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  paginationInfo,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPageSelector = false,
  maxPageButtons = 5,
  compact = false
}) => {
  const service = new PaginationService();
  const pageNumbers = service.calculatePageRange(
    paginationInfo.currentPage,
    paginationInfo.totalPages,
    maxPageButtons
  );

  // 如果沒有資料，顯示相應訊息
  if (paginationInfo.totalItems === 0) {
    return (
      <div className="pagination-container">
        <div className="pagination-info">沒有資料</div>
      </div>
    );
  }

  // 如果只有一頁且是簡約模式，不顯示分頁
  if (paginationInfo.totalPages === 1 && compact) {
    return null;
  }

  const itemsPerPageOptions = [10, 20, 50, 100];

  return (
    <nav className="pagination-container" aria-label="分頁導航">
      {!compact && (
        <div className="pagination-info">
          顯示 {paginationInfo.startIndex + 1}-{paginationInfo.endIndex + 1} 筆，共 {paginationInfo.totalItems} 筆
        </div>
      )}

      <div className="pagination-controls">
        {/* 第一頁按鈕 */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={!paginationInfo.hasPrevious}
          title="第一頁"
          aria-label="第一頁"
        >
          ⟨⟨
        </button>

        {/* 上一頁按鈕 */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(paginationInfo.currentPage - 1)}
          disabled={!paginationInfo.hasPrevious}
          title="上一頁"
          aria-label="上一頁"
        >
          ⟨
        </button>

        {/* 頁碼按鈕 */}
        {!compact ? (
          pageNumbers.map(pageNumber => (
            <button
              key={pageNumber}
              className={`pagination-btn ${pageNumber === paginationInfo.currentPage ? 'active' : ''}`}
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === paginationInfo.currentPage ? 'page' : undefined}
              aria-label={`第 ${pageNumber} 頁`}
            >
              {pageNumber}
            </button>
          ))
        ) : (
          <span className="pagination-current">
            {paginationInfo.currentPage} / {paginationInfo.totalPages}
          </span>
        )}

        {/* 下一頁按鈕 */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(paginationInfo.currentPage + 1)}
          disabled={!paginationInfo.hasNext}
          title="下一頁"
          aria-label="下一頁"
        >
          ⟩
        </button>

        {/* 最後一頁按鈕 */}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(paginationInfo.totalPages)}
          disabled={!paginationInfo.hasNext}
          title="最後一頁"
          aria-label="最後一頁"
        >
          ⟩⟩
        </button>
      </div>

      {!compact && (
        <div className="pagination-page-info">
          第 {paginationInfo.currentPage} 頁，共 {paginationInfo.totalPages} 頁
        </div>
      )}

      {showItemsPerPageSelector && onItemsPerPageChange && (
        <div className="pagination-items-per-page">
          <label htmlFor="items-per-page">每頁顯示：</label>
          <select
            id="items-per-page"
            value={paginationInfo.itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="pagination-select"
          >
            {itemsPerPageOptions.map(option => (
              <option key={option} value={option}>
                {option} 筆
              </option>
            ))}
          </select>
        </div>
      )}

      <style jsx>{`
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem 0;
          font-size: 14px;
        }

        .pagination-info {
          color: #666;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .pagination-btn {
          min-width: 2.5rem;
          height: 2.5rem;
          padding: 0.5rem;
          border: 1px solid #ddd;
          background: white;
          color: #333;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f0f0f0;
          border-color: #999;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
          font-weight: 600;
        }

        .pagination-current {
          padding: 0 1rem;
          color: #666;
          font-weight: 500;
        }

        .pagination-page-info {
          color: #666;
        }

        .pagination-items-per-page {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-items-per-page label {
          color: #666;
        }

        .pagination-select {
          padding: 0.25rem 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
          font-size: 14px;
          cursor: pointer;
        }

        .pagination-select:hover {
          border-color: #999;
        }

        /* 響應式設計 */
        @media (max-width: 768px) {
          .pagination-container {
            justify-content: center;
          }

          .pagination-info,
          .pagination-page-info {
            width: 100%;
            text-align: center;
          }

          .pagination-btn {
            min-width: 2rem;
            height: 2rem;
            font-size: 12px;
          }
        }
      `}</style>
    </nav>
  );
};