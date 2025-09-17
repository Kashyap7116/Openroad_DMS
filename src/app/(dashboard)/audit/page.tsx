import { Suspense } from 'react'
import AuditDashboard from '@/modules/admin/components/audit-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/components/ui/ui/card'
import { RefreshCw } from 'lucide-react'

function AuditLoadingFallback() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">System Audit</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            Loading Audit System...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Initializing comprehensive database audit and validation system...
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuditPage() {
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<AuditLoadingFallback />}>
        <AuditDashboard />
      </Suspense>
    </div>
  )
}


