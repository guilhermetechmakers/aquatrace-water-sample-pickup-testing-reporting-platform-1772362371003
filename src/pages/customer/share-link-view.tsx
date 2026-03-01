/**
 * Public Share Link View - Validates token and displays report/invoice PDF
 * No authentication required
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
const FUNCTIONS_URL =
  (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '') + '/functions/v1'

export function ShareLinkViewPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'success'; url: string; targetType: string }
  >({ status: 'loading' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: 'Invalid link' })
      return
    }

    let cancelled = false

    async function validate() {
      try {
        const res = await fetch(
          `${FUNCTIONS_URL}/validate-share-link?token=${encodeURIComponent(token ?? '')}`
        )
        const data = (await res.json()) as {
          error?: string
          url?: string
          targetType?: string
        }

        if (cancelled) return

        if (!res.ok) {
          setState({
            status: 'error',
            message: data?.error ?? 'Link is invalid or has expired',
          })
          return
        }

        if (data?.url) {
          setState({
            status: 'success',
            url: data.url,
            targetType: data.targetType ?? 'report',
          })
        } else {
          setState({
            status: 'error',
            message: data?.error ?? 'Document not available',
          })
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error', message: 'Failed to load shared document' })
        }
      }
    }

    validate()
    return () => {
      cancelled = true
    }
  }, [token])

  if (state.status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Validating link...</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Unable to load document</h1>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {state.message}
        </p>
        <Button
          variant="outline"
          onClick={() => window.close()}
        >
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">
            Shared {state.targetType === 'invoice' ? 'Invoice' : 'Report'}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(state.url, '_blank')}
        >
          Open in new tab
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <iframe
            src={state.url}
            title="Shared document"
            className="w-full h-[80vh] min-h-[500px] border-0"
          />
        </CardContent>
      </Card>
    </div>
  )
}
