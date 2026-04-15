import { useState } from 'react'
import DOMPurify from 'dompurify'
import { Link } from 'react-router-dom'
import { Plus, LogOut, Mail, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// DB schema:
// email_campaigns(id, tenant_id, created_by, subject, preview_text, body_html, status, target_type, target_course_id, sent_at, total_sent, created_at)
// target_type: 'all' | 'course'
// status: 'draft' | 'sending' | 'sent'

type TargetType = 'all' | 'course'
type CampaignStatus = 'draft' | 'sending' | 'sent'

interface Campaign {
  id: string
  tenant_id: string
  created_by: string
  subject: string
  preview_text: string | null
  body_html: string | null
  status: CampaignStatus
  target_type: TargetType
  target_course_id: string | null
  sent_at: string | null
  total_sent: number | null
  created_at: string
  course?: { title: string } | null
}

interface CampaignFormData {
  subject: string
  preview_text: string
  body_html: string
  target_type: TargetType
  target_course_id: string
}

const defaultFormData: CampaignFormData = {
  subject: '',
  preview_text: '',
  body_html: '',
  target_type: 'all',
  target_course_id: '',
}

const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  sending: 'Enviando',
  sent: 'Enviado',
}

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'secondary',
  sending: 'default',
  sent: 'default',
}

export default function EmailMarketing() {
  const { profile, tenant, session, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [showEditor, setShowEditor] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>(defaultFormData)
  const [confirmSendCampaign, setConfirmSendCampaign] = useState<Campaign | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns', tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*, course:courses(title)')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Campaign[]
    },
  })

  const { data: instructorCourses } = useQuery({
    queryKey: ['instructor-courses-email', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', profile!.id)
        .order('title')
      return data ?? []
    },
  })

  const instructorCourseIds = instructorCourses?.map(c => c.id) ?? []

  const { data: recipientCount } = useQuery({
    queryKey: ['recipient-count', formData.target_type, formData.target_course_id, instructorCourseIds.join(',')],
    enabled: instructorCourseIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .in('mp_status', ['free', 'approved'])

      if (formData.target_type === 'course' && formData.target_course_id) {
        q = q.eq('course_id', formData.target_course_id)
      } else if (instructorCourseIds.length > 0) {
        q = q.in('course_id', instructorCourseIds)
      }

      const { count } = await q
      return count ?? 0
    },
  })

  const saveCampaign = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      if (!profile || !tenant) throw new Error('Sin sesión')
      if (editingCampaign) {
        const { error } = await supabase
          .from('email_campaigns')
          .update({
            subject: data.subject,
            preview_text: data.preview_text || null,
            body_html: data.body_html || null,
            target_type: data.target_type,
            target_course_id: data.target_type === 'course' ? data.target_course_id || null : null,
          } as any)
          .eq('id', editingCampaign.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('email_campaigns')
          .insert({
            tenant_id: tenant.id,
            created_by: profile.id,
            subject: data.subject,
            preview_text: data.preview_text || null,
            body_html: data.body_html || null,
            status: 'draft',
            target_type: data.target_type,
            target_course_id: data.target_type === 'course' ? data.target_course_id || null : null,
          } as any)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
      setShowEditor(false)
      setEditingCampaign(null)
      setFormData(defaultFormData)
      toast.success(editingCampaign ? 'Campaña guardada' : 'Campaña creada')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sendCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      if (!session) throw new Error('Sin sesión')
      // Mark as sending
      await supabase
        .from('email_campaigns')
        .update({ status: 'sending' } as any)
        .eq('id', campaignId)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      )
      const responseData = await res.json()
      if (!res.ok || responseData.error) throw new Error(responseData.error ?? 'Error al enviar la campaña')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
      setConfirmSendCampaign(null)
      toast.success('Campaña enviada correctamente')
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] })
      setConfirmSendCampaign(null)
      toast.error(e.message)
    },
  })

  function openCreate() {
    setEditingCampaign(null)
    setFormData(defaultFormData)
    setShowEditor(true)
  }

  function openEdit(campaign: Campaign) {
    setEditingCampaign(campaign)
    setFormData({
      subject: campaign.subject,
      preview_text: campaign.preview_text ?? '',
      body_html: campaign.body_html ?? '',
      target_type: campaign.target_type,
      target_course_id: campaign.target_course_id ?? '',
    })
    setShowEditor(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name} className="h-8 w-auto object-contain" />
            <Badge variant="secondary" className="text-xs">Email Marketing</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/instructor">Panel Instructor</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings">Configuración</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gray-900">Email Marketing</h1>
            <p className="text-gray-500 mt-1">Creá y enviá campañas a tus estudiantes</p>
          </div>
          <Button variant="hero" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === campaign.id ? null : campaign.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{campaign.subject}</span>
                      <Badge variant={STATUS_COLORS[campaign.status] as any} className="text-xs shrink-0">
                        {STATUS_LABELS[campaign.status]}
                      </Badge>
                      <span className="text-xs text-gray-400 shrink-0">
                        {campaign.target_type === 'all' ? 'Todos los estudiantes' : `Curso: ${campaign.course?.title ?? '—'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {campaign.sent_at ? (
                        <span>Enviado: {new Date(campaign.sent_at).toLocaleDateString('es-AR')}</span>
                      ) : (
                        <span>Creado: {new Date(campaign.created_at).toLocaleDateString('es-AR')}</span>
                      )}
                      {campaign.total_sent != null && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {campaign.total_sent} enviados
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {campaign.status === 'draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500"
                          onClick={e => { e.stopPropagation(); openEdit(campaign) }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="hero"
                          size="sm"
                          className="gap-1"
                          onClick={e => { e.stopPropagation(); setConfirmSendCampaign(campaign) }}
                        >
                          <Send className="w-3 h-3" />
                          Enviar
                        </Button>
                      </>
                    )}
                    {expandedId === campaign.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>
                {expandedId === campaign.id && campaign.body_html && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Vista previa del contenido:</p>
                    <div
                      className="text-sm text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.body_html) }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-4">
            <Mail className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500">No hay campañas todavía.</p>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Crear primera campaña
            </Button>
          </div>
        )}
      </main>

      {/* Campaign editor dialog */}
      <Dialog open={showEditor} onOpenChange={open => { if (!open) { setShowEditor(false); setEditingCampaign(null); setFormData(defaultFormData) } }}>
        <DialogContent className="bg-white border-gray-200 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">
              {editingCampaign ? 'Editar campaña' : 'Nueva campaña'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-2">
            <TabsList className="bg-gray-100 w-full">
              <TabsTrigger value="content" className="flex-1">Contenido</TabsTrigger>
              <TabsTrigger value="recipients" className="flex-1">Destinatarios</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>Asunto *</Label>
                <Input
                  placeholder="Novedad importante para vos..."
                  value={formData.subject}
                  onChange={e => setFormData(f => ({ ...f, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Preview text</Label>
                <Input
                  placeholder="Texto que aparece en la bandeja de entrada..."
                  value={formData.preview_text}
                  onChange={e => setFormData(f => ({ ...f, preview_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Cuerpo del email</Label>
                <textarea
                  placeholder="Escribí en HTML o texto plano..."
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-y h-48 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  value={formData.body_html}
                  onChange={e => setFormData(f => ({ ...f, body_html: e.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label>Destinatarios</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="target_type"
                      value="all"
                      checked={formData.target_type === 'all'}
                      onChange={() => setFormData(f => ({ ...f, target_type: 'all', target_course_id: '' }))}
                      className="text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Todos los estudiantes</p>
                      <p className="text-xs text-gray-500">Todos los inscriptos en cualquier curso</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="target_type"
                      value="course"
                      checked={formData.target_type === 'course'}
                      onChange={() => setFormData(f => ({ ...f, target_type: 'course' }))}
                      className="text-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Estudiantes de un curso específico</p>
                      <p className="text-xs text-gray-500">Solo los inscriptos en el curso seleccionado</p>
                    </div>
                  </label>
                </div>

                {formData.target_type === 'course' && instructorCourses && instructorCourses.length > 0 && (
                  <div className="space-y-1.5 pl-2">
                    <Label>Seleccioná el curso</Label>
                    <select
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                      value={formData.target_course_id}
                      onChange={e => setFormData(f => ({ ...f, target_course_id: e.target.value }))}
                    >
                      <option value="">— Seleccioná un curso —</option>
                      {instructorCourses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Destinatarios estimados:</span>{' '}
                    {recipientCount != null ? `${recipientCount} estudiante${recipientCount !== 1 ? 's' : ''}` : 'Calculando...'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-2">
            <Button
              variant="hero"
              disabled={saveCampaign.isPending || !formData.subject.trim()}
              onClick={() => saveCampaign.mutate(formData)}
              className="flex-1"
            >
              {saveCampaign.isPending ? 'Guardando...' : 'Guardar como borrador'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setShowEditor(false); setEditingCampaign(null); setFormData(defaultFormData) }}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm send dialog */}
      <Dialog open={!!confirmSendCampaign} onOpenChange={open => !open && setConfirmSendCampaign(null)}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-gray-900">¿Enviar campaña?</DialogTitle>
            <DialogDescription className="text-gray-600">
              Esto enviará el email a{' '}
              <span className="font-semibold text-gray-900">
                {recipientCount ?? '...'} estudiante{recipientCount !== 1 ? 's' : ''}
              </span>
              . Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              variant="hero"
              disabled={sendCampaign.isPending}
              onClick={() => confirmSendCampaign && sendCampaign.mutate(confirmSendCampaign.id)}
              className="flex-1 gap-2"
            >
              <Send className="w-4 h-4" />
              {sendCampaign.isPending ? 'Enviando...' : 'Sí, enviar'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmSendCampaign(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
