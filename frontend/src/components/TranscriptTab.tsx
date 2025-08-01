import React, { useState } from "react";
import { TranscriptItem } from "../types";
import TranscriptItemComponent from "./TranscriptItem";

interface TranscriptTabProps {
  transcript: TranscriptItem[];
  searchQuery: string;
  activeFilter: string;
  participants: string[];
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onSeekToTime: (seconds: number) => void;
  currentTime?: number; // Current audio time
}

const TranscriptTab: React.FC<TranscriptTabProps> = ({
  transcript,
  searchQuery,
  activeFilter,
  participants,
  onSearchChange,
  onFilterChange,
  onSeekToTime,
  currentTime = 0,
}) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Calculate statistics
  const totalDuration =
    transcript.length > 0 ? transcript[transcript.length - 1].end : "0:00:00";
  const totalWords = transcript.reduce(
    (sum, item) => sum + item.text.split(" ").length,
    0
  );
  const averageConfidence =
    transcript.length > 0
      ? transcript.reduce((sum, item) => sum + (item.confidence || 0), 0) /
        transcript.length
      : 0;

  const filters: { label: string; value: string }[] = [];
  filters.push({ label: "All", value: "All" });

  for (const participant of participants) {
    const segmentCount = transcript.filter(
      (t) => t.speakerName === participant
    ).length;
    filters.push({
      label: `${participant} (${segmentCount})`,
      value: participant,
    });
  }

  // Calculate pagination
  const totalItems = transcript.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTranscript = transcript.slice(startIndex, endIndex);

  // Reset to first page when transcript changes
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Reset pagination when search or filter changes
  React.useEffect(() => {
    resetPagination();
  }, [searchQuery, activeFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of transcript section
    document
      .querySelector(".tab-content")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const half = Math.floor(maxPagesToShow / 2);
      let start = Math.max(currentPage - half, 1);
      let end = Math.min(start + maxPagesToShow - 1, totalPages);

      if (end - start < maxPagesToShow - 1) {
        start = Math.max(end - maxPagesToShow + 1, 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="tab-content">
      {/* Statistics Section */}
      <div
        className="transcript-stats"
        style={{
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="stat-item">
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#1e40af" }}
          >
            {transcript.length}
          </div>
          <div style={{ fontSize: "14px", color: "#64748b" }}>
            Total Segments
          </div>
        </div>
        <div className="stat-item">
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}
          >
            {totalWords.toLocaleString()}
          </div>
          <div style={{ fontSize: "14px", color: "#64748b" }}>Total Words</div>
        </div>
        <div className="stat-item">
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}
          >
            {participants.length}
          </div>
          <div style={{ fontSize: "14px", color: "#64748b" }}>Speakers</div>
        </div>
        <div className="stat-item">
          <div
            style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}
          >
            {totalDuration}
          </div>
          <div style={{ fontSize: "14px", color: "#64748b" }}>Duration</div>
        </div>
        {averageConfidence > 0 && (
          <div className="stat-item">
            <div
              style={{ fontSize: "24px", fontWeight: "bold", color: "#d97706" }}
            >
              {Math.round(averageConfidence * 100)}%
            </div>
            <div style={{ fontSize: "14px", color: "#64748b" }}>
              Avg. Confidence
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <input
          type="text"
          className="search-box"
          placeholder="🔍 Cari dalam transcript..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="filters">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`filter-btn ${
                activeFilter === filter.value ? "active" : ""
              }`}
              onClick={() => onFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination Info and Controls */}
      <div className="pagination-info">
        <div className="results-info">
          Showing {Math.min(startIndex + 1, totalItems)} -{" "}
          {Math.min(endIndex, totalItems)} of {totalItems} items
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </div>
        <div className="items-per-page">
          <label>Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="items-select"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Transcript Items */}
      <div className="transcript-list">
        {currentTranscript.length > 0 ? (
          currentTranscript.map((item, index) => (
            <TranscriptItemComponent
              key={startIndex + index}
              item={item}
              onSeekToTime={onSeekToTime}
              currentTime={currentTime}
            />
          ))
        ) : (
          <div className="no-results">
            <p>No transcript items found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            First
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            Previous
          </button>

          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              className={`pagination-btn ${
                currentPage === pageNum ? "active" : ""
              }`}
              onClick={() => handlePageChange(pageNum)}
              title={`Go to page ${pageNum}`}
            >
              {pageNum}
            </button>
          ))}

          <button
            className="pagination-btn"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            Next
          </button>
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            Last
          </button>

          {totalPages > 5 && (
            <div className="jump-to-page">
              <span>Go to:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = Number(e.target.value);
                  if (page >= 1 && page <= totalPages) {
                    handlePageChange(page);
                  }
                }}
                className="page-input"
                title="Jump to page"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TranscriptTab;
