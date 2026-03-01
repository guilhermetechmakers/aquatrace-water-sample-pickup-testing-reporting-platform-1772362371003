/**
 * Template Localization & Preview (page_017)
 * Localization switcher, live preview with sample data
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Globe, Eye, ArrowLeft, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import { useTemplates } from '@/hooks/useNotifications'

const SAMPLE_DATA: Record<string, string> = {
  customerName: 'Acme Water Co.',
  invoiceId: 'INV-2024-001',
  pickupId: 'PKP-12345',
  labResults: 'SPC: 2 CFU/mL, Total Coliform: 0',
  dueDate: '2024-03-15',
  reportId: 'RPT-001',
  reportTitle: 'Water Sample Test Report',
}

function renderPreview(html: string): string {
  let out = html
  for (const [key, val] of Object.entries(SAMPLE_DATA)) {
    out = out.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'),
      val
    )
  }
  out = out.replace(/\{\{[^}]+\}\}/g, '—')
  return out
}

export function TemplateLocalizationPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const { hasPermission } = useRBAC()
  const { data: templatesData, isLoading } = useTemplates({ published: undefined })
  const templates = Array.isArray(templatesData) ? templatesData : []
  const [selectedLang, setSelectedLang] = useState('en')

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view template localization.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const safeTemplates = Array.isArray(templates) ? templates : []
  const template = templateId
    ? safeTemplates.find((t) => t.id === templateId)
    : safeTemplates[0]
  const localizedVersions = safeTemplates.filter(
    (t) => t.name === template?.name
  )
  const currentVersion =
    localizedVersions.find((t) => t.language === selectedLang) ?? template

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/admin/templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Template Localization & Preview
          </h1>
          <p className="mt-1 text-muted-foreground">
            Switch languages and preview with sample data
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : !template ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Template not found</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard/admin/templates">Back to Templates</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Languages
                </CardTitle>
                <CardDescription>
                  Select a language to preview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {localizedVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No localized versions yet
                  </p>
                ) : (
                  localizedVersions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedLang(t.language)}
                      className={`w-full rounded-lg border p-3 text-left transition-all hover:border-primary/30 ${
                        selectedLang === t.language
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                    >
                      <p className="font-medium">{t.language}</p>
                      <p className="text-xs text-muted-foreground">
                        v{t.version}
                        {t.isPublished && ' • Published'}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Rendered with sample data: customerName, invoiceId, etc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Subject
                    </p>
                    <p className="font-medium">
                      {renderPreview(currentVersion?.subject ?? '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      HTML Body
                    </p>
                    <div
                      className="rounded-lg border bg-muted/30 p-4 prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(
                          currentVersion?.htmlBody ?? '<p>No content</p>'
                        ),
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Plain Text
                    </p>
                    <pre className="rounded-lg border bg-muted/30 p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                      {renderPreview(currentVersion?.textBody ?? '')}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
