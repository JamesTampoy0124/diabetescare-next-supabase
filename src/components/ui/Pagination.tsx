import Link from "next/link";

interface PaginationProps {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  params?: Record<string, string>;
}

function href(basePath: string, params: Record<string, string>, page: number) {
  const search = new URLSearchParams(params);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({ basePath, page, pageSize, total, params = {} }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <span>
        {from}-{to} of {total}
      </span>
      <div>
        {page > 1 && (
          <Link className="action-btn" href={href(basePath, params, page - 1)}>
            Previous
          </Link>
        )}
        {page < pages && (
          <Link className="action-btn" href={href(basePath, params, page + 1)}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
