export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-text-muted">
      <p className="text-sm">No data yet</p>
      <p className="text-xs mt-1 opacity-60">Data will appear here once synced</p>
    </div>
  );
}
