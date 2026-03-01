/**
 * ShareLinkDialog - Generate/renew secure share link with expiration
 */

import { useState } from 'react'
import { Copy, Link2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateShareLink } from '@/hooks/usePortal'
import { toast } from 'sonner'

export interface ShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'report' | 'invoice'
  targetId: string
  reportId?: string // Display ID for dialog title/description
}

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 24, label: '24 hours' },
  { value: 72, label: '3 days' },
  { value: 168, label: '7 days' },
]

export function ShareLinkDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  reportId: _reportId,
}: ShareLinkDialogProps) {
  const [expiresInHours, setExpiresInHours] = useState(24)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createShare = useCreateShareLink()

  const handleGenerate = async () => {
    try {
      const link = await createShare.mutateAsync({
        targetType,
        targetId,
        expiresInHours,
      })
      if (link) {
        const base = typeof window !== 'undefined' ? window.location.origin : ''
        const url = `${base}/portal/share/${link.token}`
        setGeneratedUrl(url)
        toast.success('Share link created')
      } else {
        toast.error('Failed to create share link')
      }
    } catch {
      toast.error('Failed to create share link')
    }
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const handleClose = () => {
    setGeneratedUrl(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Generate Secure Share Link
          </DialogTitle>
          <DialogDescription>
            Create a time-limited link to share this {targetType}
            {_reportId ? ` (${_reportId})` : ''} with others. The link will expire after the selected
            duration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedUrl ? (
            <>
              <div className="space-y-2">
                <Label>Expiration</Label>
                <div className="flex flex-wrap gap-2">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={expiresInHours === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setExpiresInHours(opt.value)}
                      className="transition-all hover:scale-[1.02]"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={createShare.isPending}
              >
                {createShare.isPending ? 'Generating...' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your share link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedUrl}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                    aria-label="Copy link"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Expires in {expiresInHours} hour{expiresInHours !== 1 ? 's' : ''}. Share this link
                securely with authorized recipients only.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
