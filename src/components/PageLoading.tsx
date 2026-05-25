/**
 * Skeleton genérico para rutas que están cargando.
 *
 * Reemplaza el spinner blanco vacío. Da feedback visual de que algo está
 * pasando sin requerir layout específico por página.
 */
export function PageLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <header className="glass-light">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 space-y-6 max-w-5xl">
        <div className="space-y-3">
          <div className="h-7 w-1/3 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-1/4 bg-secondary rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white border border-border/40 rounded-2xl p-4 space-y-3">
              <div className="h-32 w-full bg-secondary rounded-xl animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
