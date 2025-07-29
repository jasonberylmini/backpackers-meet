import React from 'react';

export default function AdminTable({
  columns = [],
  data = [],
  loading = false,
  error = null,
  page = 1,
  pageCount = 1,
  onPageChange = () => {},
  onSort = () => {},
  sortKey = '',
  sortDirection = 'asc',
  actions = null,
  emptyMessage = 'No data found.'
}) {
  return (
    <div className="admin-dashboard-table-wrapper">
      {loading ? (
        <table className="admin-dashboard-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="admin-dashboard-table-skeleton-row">
                <td colSpan={columns.length + (actions ? 1 : 0)}><span className="admin-dashboard-table-skeleton" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : error ? (
        <div className="admin-dashboard-table-error">
          {error} <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <>
          <table className="admin-dashboard-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && onSort(col.key)}
                    tabIndex={col.sortable ? 0 : -1}
                    className={
                      col.sortable && sortKey === col.key
                        ? `sorted-${sortDirection}`
                        : ''
                    }
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  >
                    {col.label}
                  </th>
                ))}
                {actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center', color: '#888' }}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row._id || idx} tabIndex={0}>
                    {columns.map(col => (
                      <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                    ))}
                    {actions && <td>{actions(row)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Pagination controls */}
          {pageCount > 1 && (
            <div className="admin-dashboard-table-pagination">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 1}>Prev</button>
              <span>Page {page} of {pageCount}</span>
              <button onClick={() => onPageChange(page + 1)} disabled={page === pageCount}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 