/**
 * Template Management UI (page_013)
 * Create, edit, localize email templates with placeholders
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Plus,
  Pencil,
  Globe,
  ChevronRight,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRBAC } from '@/hooks/useRBAC'
import { useTemplates, useUpsertTemplate } from '@/hooks/useNotifications'
import type { NotificationTemplate } from '@/types/notifications'

const PLACEHOLDERS = [
  'customerName',
  'invoiceId',
  'pickupId',
  'labResults',
  'dueDate',
  'reportId',
  'reportTitle',
] as const

export function AdminTemplatesPage() {
  const { hasPermission } = useRBAC()
  const { data: templatesData, isLoading } = useTemplates({ published: undefined })
  const templates = Array.isArray(templatesData) ? templatesData : []
  const upsertTemplate = useUpsertTemplate()
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)
  const [form, setForm] = useState({
    name: '',
    language: 'en',
    subject: '',
    html_body: '',
    text_body: '',
    is_published: false,
  })

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to manage templates.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const handleCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      language: 'en',
      subject: '',
      html_body: '',
      text_body: '',
      is_published: false,
    })
  }

  const handleEdit = (t: NotificationTemplate) => {
    setEditing(t)
    setForm({
      name: t.name,
      language: t.language,
      subject: t.subject ?? '',
      html_body: t.htmlBody ?? '',
      text_body: t.textBody ?? '',
      is_published: t.isPublished,
    })
  }

  const handleSave = () => {
    upsertTemplate.mutate(
      {
        id: editing?.id,
        name: form.name,
        language: form.language,
        subject: form.subject,
        htmlBody: form.html_body,
        textBody: form.text_body,
        isPublished: form.is_published,
      },
      {
        onSuccess: () => {
          setEditing(null)
          handleCreate()
        },
      }
    )
  }

  const safeTemplates = Array.isArray(templates) ? templates : []

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Template Management</h1>
        <p className="mt-1 text-muted-foreground">
          Create and edit email templates with placeholders and localization
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="transition-all hover:shadow-card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Templates
              </CardTitle>
              <CardDescription>
                Available placeholders: {PLACEHOLDERS.join(', ')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-lg bg-muted/50 animate-pulse"
                    />
                  ))}
                </div>
              ) : safeTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No templates yet</p>
                  <Button className="mt-4" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {safeTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30"
                    >
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.language} • v{t.version}
                          {t.isPublished && (
                            <span className="ml-2 rounded bg-success/20 px-1.5 py-0.5 text-xs text-success">
                              Published
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/dashboard/admin/template-localization/${t.id}`}>
                            <Globe className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="transition-all hover:shadow-card-hover sticky top-4">
            <CardHeader>
              <CardTitle>
                {editing ? 'Edit Template' : 'New Template'}
              </CardTitle>
              <CardDescription>
                {editing
                  ? 'Update template content'
                  : 'Create a new email template'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. pickup_assigned"
                  disabled={upsertTemplate.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  placeholder="en"
                  disabled={upsertTemplate.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Hello {{customerName}}"
                  disabled={upsertTemplate.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="html_body">HTML Body</Label>
                <textarea
                  id="html_body"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.html_body}
                  onChange={(e) => setForm((f) => ({ ...f, html_body: e.target.value }))}
                  placeholder="<p>Use {{customerName}}, {{pickupId}}, etc.</p>"
                  disabled={upsertTemplate.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_body">Plain Text Body</Label>
                <textarea
                  id="text_body"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.text_body}
                  onChange={(e) => setForm((f) => ({ ...f, text_body: e.target.value }))}
                  placeholder="Plain text fallback"
                  disabled={upsertTemplate.isPending}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_published: e.target.checked }))
                  }
                  disabled={upsertTemplate.isPending}
                  className="rounded border-input"
                />
                <Label htmlFor="is_published">Published</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!form.name || upsertTemplate.isPending}
                >
                  {upsertTemplate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
                {editing && (
                  <Button variant="outline" onClick={handleCreate}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Button variant="outline" asChild>
        <Link to="/dashboard/admin/notifications">
          <ChevronRight className="h-4 w-4 mr-2" />
          Back to Notification Config
        </Link>
      </Button>
    </div>
  )
}
