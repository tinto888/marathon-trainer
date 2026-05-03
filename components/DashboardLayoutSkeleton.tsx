export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen blueprint-bg">
      {/* Sidebar skeleton */}
      <div className="w-60 border-r border-border/50 p-4 flex flex-col gap-4">
        <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        <div className="flex flex-col gap-2 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="mt-auto h-12 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
