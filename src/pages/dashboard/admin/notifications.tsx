/**
 * Admin Notifications & Alerts
 * page_011: Integrations, templates, throttling
 * page_013: Template management
 * page_017: Template localization & preview
 * page_018: Alerts & Analytics dashboard
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  Settings,
  FileText,
  Globe,
  BarChart3,
  ChevronRight,
  Send,
  Plus,
  Mail,
  Smartphone,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useRBAC } from '@/hooks/useRBAC'
import {
  useNotificationTemplates,
  useNotificationAudit,
  useUpsertNotificationTemplate,
  usePublishTestNotification,
} from '@/hooks/useNotifications'
import { useAuth } from '@/contexts/auth-context'
import { NOTIFICATION_EVENT_LABELS, TEMPLATE_PLACEHOLDERS } from '@/types/notifications'
import type { NotificationEventType } from '@/types/notifications'
import { cn } from '@/lib/utils'

const SAMPLE_PAYLOAD: Record<string, string> = {
  customerName: 'Acme Water Co',
  invoiceId: 'INV-001',
  pickupId: 'PK-123',
  labResults: 'Pass',
  dueDate: '2025-03-15',
  reportUrl: 'https://example.com/report/1',
  technicianName: 'Jane Smith',
  sampleId: 'SMP-456',
}

function replacePlaceholders(text: string, data: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '')
    result = result.replace(new RegExp(`{{${key}}}`, 'gi'), value ?? '')
  }
  return result
}

export function AdminNotificationsPage() {
  const { hasPermission } = useRBAC()
  const { user } = useAuth()
  const { data: templatesData, isLoading: templatesLoading } = useNotificationTemplates()
  const { data: auditData, isLoading: auditLoading } = useNotificationAudit()
  const upsertTemplate = useUpsertNotificationTemplate()
  const publishTest = usePublishTestNotification()

  const [activeTab, setActiveTab] = useState('overview')
  const [editingTemplate, setEditingTemplate] = useState<{
    id?: string
    name: string
    language: string
    subject: string
    htmlBody: string
    textBody: string
    isPublished: boolean
  } | null>(null)
  const [previewData, setPreviewData] = useState(SAMPLE_PAYLOAD)

  const templates = templatesData?.templates ?? []
  const { notifications = [], metrics } = auditData ?? {}
  const m = metrics ?? { totalSent: 0, totalFailed: 0, totalQueued: 0, deadLetterCount: 0 }
  const totalSent = m.totalSent ?? 0
  const totalFailed = m.totalFailed ?? 0
  const totalQueued = m.totalQueued ?? 0
  const deadLetterCount = m.deadLetterCount ?? 0

  if (!hasPermission('admin_ui', 'read')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access notification settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications & Alerts</h1>
        <p className="mt-1 text-muted-foreground">
          Manage templates, integrations, and view delivery analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="localization" className="gap-2">
            <Globe className="h-4 w-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Settings className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {auditLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-success/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Send className="h-4 w-4 text-success" />
                      Delivered
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-success">{totalSent}</p>
                  </CardContent>
                </Card>
                <Card className="border-destructive/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Send className="h-4 w-4 text-destructive" />
                      Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">{totalFailed}</p>
                  </CardContent>
                </Card>
                <Card className="border-accent/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      Queued
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{totalQueued}</p>
                  </CardContent>
                </Card>
                <Card className="border-warning/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Bell className="h-4 w-4 text-warning" />
                      Dead Letter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-warning">{deadLetterCount}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent notifications</CardTitle>
                  <CardDescription>
                    {notifications.length} notifications in audit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notifications.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.slice(0, 20).map((n) => (
                          <div
                            key={n.id}
                            className="flex items-center justify-between rounded-lg border p-3 text-sm"
                          >
                            <span className="font-medium">
                              {NOTIFICATION_EVENT_LABELS[n.eventType as NotificationEventType] ?? n.eventType}
                            </span>
                            <span className={cn(
                              'rounded px-2 py-0.5 text-xs',
                              n.status === 'delivered' && 'bg-success/20 text-success',
                              n.status === 'failed' && 'bg-destructive/20 text-destructive',
                              n.status === 'queued' && 'bg-accent/20 text-accent'
                            )}>
                              {n.status}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-8 text-center">No notifications yet</p>
                  )}
                </CardContent>
              </Card>

              {user && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Send test notification</CardTitle>
                    <CardDescription>
                      Trigger a test event to yourself
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(['pickup_assigned', 'lab_results_ready', 'invoice_created'] as const).map((evt) => (
                        <Button
                          key={evt}
                          variant="outline"
                          size="sm"
                          onClick={() => publishTest.mutate(evt)}
                          disabled={publishTest.isPending}
                        >
                          {NOTIFICATION_EVENT_LABELS[evt]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {editingTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplate.id ? 'Edit template' : 'New template'}</CardTitle>
                <CardDescription>
                  Use placeholders: {TEMPLATE_PLACEHOLDERS.map((p) => `{{${p}}}`).join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lang">Language</Label>
                    <Input
                      id="lang"
                      value={editingTemplate.language}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, language: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subject (email)</Label>
                  <Input
                    id="subject"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="html">HTML body</Label>
                  <textarea
                    id="html"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editingTemplate.htmlBody}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlBody: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="text">Plain text body</Label>
                  <textarea
                    id="text"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editingTemplate.textBody}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, textBody: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={editingTemplate.isPublished}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isPublished: e.target.checked })}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      upsertTemplate.mutate(
                        {
                          id: editingTemplate.id,
                          name: editingTemplate.name,
                          language: editingTemplate.language,
                          subject: editingTemplate.subject,
                          htmlBody: editingTemplate.htmlBody,
                          textBody: editingTemplate.textBody,
                          isPublished: editingTemplate.isPublished,
                        },
                        {
                          onSuccess: () => setEditingTemplate(null),
                        }
                      )
                    }}
                    disabled={upsertTemplate.isPending}
                  >
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <Button onClick={() => setEditingTemplate({
                  id: undefined,
                  name: '',
                  language: 'en',
                  subject: '',
                  htmlBody: '',
                  textBody: '',
                  isPublished: false,
                })}>
                  <Plus className="h-4 w-4 mr-2" />
                  New template
                </Button>
              </div>
              {templatesLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <Card
                      key={t.id}
                      className="cursor-pointer transition-all hover:shadow-card-hover"
                      onClick={() => setEditingTemplate({
                        id: t.id,
                        name: t.name,
                        language: t.language,
                        subject: t.subject ?? '',
                        htmlBody: t.htmlBody ?? '',
                        textBody: t.textBody ?? '',
                        isPublished: t.isPublished,
                      })}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-sm text-muted-foreground">{t.language} • v{t.version}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.isPublished && (
                            <span className="rounded bg-success/20 px-2 py-0.5 text-xs text-success">Published</span>
                          )}
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No templates yet</p>
                    <Button
                      className="mt-4"
                      onClick={() => setEditingTemplate({
                        id: undefined,
                        name: '',
                        language: 'en',
                        subject: '',
                        htmlBody: '',
                        textBody: '',
                        isPublished: false,
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create first template
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="localization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Template preview</CardTitle>
              <CardDescription>
                Preview templates with sample data. Edit placeholders below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <div key={p}>
                    <Label htmlFor={`preview-${p}`}>{p}</Label>
                    <Input
                      id={`preview-${p}`}
                      value={previewData[p] ?? ''}
                      onChange={(e) => setPreviewData({ ...previewData, [p]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              {templates.filter((t) => t.isPublished).length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium">Published templates</h4>
                  {templates.map((t) => (
                    <div key={t.id} className="rounded-lg border p-4">
                      <p className="font-medium mb-2">{t.name} ({t.language})</p>
                      <div className="rounded bg-muted/50 p-3 text-sm prose prose-sm max-w-none">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: replacePlaceholders(t.htmlBody ?? '', previewData),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No published templates to preview</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-primary/20">
              <CardHeader>
                <Mail className="h-10 w-10 text-primary" />
                <CardTitle>SendGrid</CardTitle>
                <CardDescription>
                  Transactional email delivery. Configure API key in Supabase secrets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>
                  Configure (via Supabase)
                </Button>
              </CardContent>
            </Card>
            <Card className="border-accent/20">
              <CardHeader>
                <Smartphone className="h-10 w-10 text-accent" />
                <CardTitle>Twilio</CardTitle>
                <CardDescription>
                  SMS and voice alerts. Configure in Supabase secrets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>
                  Configure (via Supabase)
                </Button>
              </CardContent>
            </Card>
            <Card className="border-success/20">
              <CardHeader>
                <Zap className="h-10 w-10 text-success" />
                <CardTitle>Firebase Cloud Messaging</CardTitle>
                <CardDescription>
                  Push notifications for mobile and web.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" disabled>
                  Configure (via Supabase)
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Throttling & retention</CardTitle>
              <CardDescription>
                Max messages per hour and blackout windows are configured per user in Profile → Notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/profile">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Profile settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
