/**
 * Skeletons específicos por page — percepción de velocidad.
 *
 * Reemplazan el PageLoading genérico en pages donde el layout es predecible
 * (Dashboard, CourseDetail). Mantienen el shell del header para que no
 * haya jump cuando termina de cargar.
 */

function Bar({ className }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
}

function Card({ className }: { className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-2xl ${className ?? ''}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Bar className="h-8 w-32" />
          <div className="flex items-center gap-3">
            <Bar className="h-7 w-7 rounded-full" />
            <Bar className="h-4 w-24 hidden sm:block" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 space-y-10">
        <div className="space-y-3">
          <Bar className="h-8 w-1/2 max-w-sm" />
          <Bar className="h-4 w-1/3 max-w-xs" />
        </div>
        {/* Continue banner */}
        <Card className="p-5 flex items-center gap-5">
          <Bar className="w-20 h-16 rounded-xl hidden sm:block" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-24" />
            <Bar className="h-5 w-2/3" />
            <Bar className="h-2 w-full" />
          </div>
          <Bar className="h-9 w-28 rounded-md" />
        </Card>
        {/* Course grid */}
        <div className="space-y-3">
          <Bar className="h-5 w-32" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="p-4 space-y-3">
                <Bar className="h-32 w-full rounded-xl" />
                <Bar className="h-4 w-3/4" />
                <Bar className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export function LessonViewSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        <Bar className="h-6 w-6 rounded" />
        <Bar className="h-4 w-64 max-w-[50%]" />
      </header>
      <main className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
        <Card className="aspect-video rounded-2xl" />
        <div className="space-y-2">
          <Bar className="h-6 w-1/3" />
          <Bar className="h-4 w-2/3" />
        </div>
        <Card className="p-5 space-y-2">
          <Bar className="h-4 w-1/2" />
          <Bar className="h-4 w-3/4" />
          <Bar className="h-4 w-2/3" />
        </Card>
      </main>
    </div>
  )
}

export function InstructorPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
        <Bar className="h-7 w-40" />
        <div className="flex gap-2">
          <Bar className="h-9 w-24 rounded-md" />
          <Bar className="h-9 w-9 rounded-md" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="grid sm:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <Card key={i} className="p-5 h-24" />)}
        </div>
        <Card className="p-6 space-y-3">
          <Bar className="h-5 w-1/3" />
          <Bar className="h-32 w-full rounded-lg" />
        </Card>
      </main>
    </div>
  )
}

export function CourseDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-900 h-72 sm:h-96" />
      <div className="container mx-auto px-4 -mt-32 pb-20">
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Bar className="h-10 w-3/4 bg-gray-700" />
            <Bar className="h-4 w-1/2 bg-gray-700" />
            <Card className="p-6 space-y-4">
              <Bar className="h-5 w-1/3" />
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-5/6" />
              <Bar className="h-4 w-4/6" />
            </Card>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => (
                <Card key={i} className="h-14" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <Card className="aspect-video rounded-2xl shadow-2xl" />
            <div className="space-y-3 mt-4">
              <Bar className="h-8 w-1/2" />
              <Bar className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
