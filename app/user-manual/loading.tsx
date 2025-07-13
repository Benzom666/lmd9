import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function UserManualLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-950">
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-32 bg-slate-700" />
        </div>

        <div className="text-center mb-8">
          <Skeleton className="h-12 w-64 mx-auto mb-4 bg-slate-700" />
          <Skeleton className="h-6 w-96 mx-auto bg-slate-700" />
        </div>

        {/* Search Skeleton */}
        <div className="max-w-md mx-auto mb-8">
          <Skeleton className="h-12 w-full bg-slate-700" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50">
              <CardHeader>
                <Skeleton className="h-6 w-24 bg-slate-700" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/50 mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 bg-slate-700" />
                  <div>
                    <Skeleton className="h-8 w-48 mb-2 bg-slate-700" />
                    <Skeleton className="h-4 w-64 bg-slate-700" />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-slate-800/30 backdrop-blur-xl border-slate-700/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 bg-slate-700" />
                      <div className="flex-1">
                        <Skeleton className="h-6 w-48 mb-2 bg-slate-700" />
                        <Skeleton className="h-4 w-full mb-4 bg-slate-700" />
                        <div className="space-y-2">
                          {[1, 2, 3].map((j) => (
                            <div key={j} className="flex items-start gap-3">
                              <Skeleton className="h-6 w-8 bg-slate-700" />
                              <Skeleton className="h-4 w-full bg-slate-700" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
