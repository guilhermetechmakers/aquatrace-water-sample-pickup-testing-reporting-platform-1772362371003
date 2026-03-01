import { useState, useRef, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, X } from 'lucide-react'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onScan: (vialId: string) => void
}

export function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerId = 'barcode-scanner-container'

  useEffect(() => {
    if (!open) return
    setManualId('')
    setError(null)
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [open])

  const startScan = () => {
    setError(null)
    setIsScanning(true)
  }

  useEffect(() => {
    if (!open || !isScanning) return
    let mounted = true
    const run = async () => {
      try {
        const scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (mounted) {
              onScan(decoded)
              onClose()
              scanner.stop().catch(() => {})
            }
          },
          () => {}
        )
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Camera access denied')
          setIsScanning(false)
        }
      }
    }
    run()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onScan/onClose are callbacks
  }, [open, isScanning])

  const stopScan = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {})
    }
    scannerRef.current = null
    setIsScanning(false)
  }

  const handleManualSubmit = () => {
    const id = manualId.trim()
    if (id) {
      onScan(id)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (stopScan(), onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan or Enter Vial ID</DialogTitle>
          <DialogDescription>
            Scan the barcode or enter the vial ID manually
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-4">
            {!isScanning ? (
              <>
                <Button variant="outline" className="w-full" onClick={startScan}>
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera
                </Button>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="manual-vial">Or enter manually</Label>
                  <Input
                    id="manual-vial"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="Vial ID"
                  />
                  <Button
                    className="w-full"
                    onClick={handleManualSubmit}
                    disabled={!manualId.trim()}
                  >
                    Use Vial ID
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div
                  id={containerId}
                  className="aspect-square rounded-lg border bg-muted"
                />
                <Button variant="outline" className="w-full" onClick={stopScan}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
