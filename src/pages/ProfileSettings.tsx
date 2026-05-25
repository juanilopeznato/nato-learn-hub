import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogOut, Save, ArrowLeft, Trophy, Flame, Star, BookOpen, Award, Zap } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { SmartAvatar } from '@/components/SmartImage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { StreakBadge } from '@/components/StreakBadge'

const profileSchema = z.object({
  full_name: z.string().min(1, 'Nombre requerido'),
  bio: z.string().max(500, 'Máximo 500 caracteres').optional(),
  avatar_url: z.string().optional(),
  social_instagram: z.string().optional(),
  social_twitter: z.string().optional(),
  social_linkedin: z.string().optional(),
  social_website: z.string().optional(),
})

type ProfileData = z.infer<typeof profileSchema>

interface CertificateRow {
  id: string
  issued_at: string
  verification_code: string
  enrollments: { courses: { title: string | null } | null } | null
}

type ProfileUpdate = Partial<{
  full_name: string
  bio: string | null
  avatar_url: string | null
  social_instagram: string | null
  social_twitter: string | null
  social_linkedin: string | null
  social_website: string | null
}>

export default function ProfileSettings() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()

  const { control, register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  const bioValue = watch('bio') ?? ''

  // Profile tiene campos extras que no están en el tipo generado (ver lib/supabase.ts)
  const profileExtras = profile as (typeof profile & {
    bio?: string | null
    social_instagram?: string | null
    social_twitter?: string | null
    social_linkedin?: string | null
    social_website?: string | null
    points?: number | null
    level?: number | null
    streak_days?: number | null
  }) | null

  useEffect(() => {
    if (!profileExtras) return
    reset({
      full_name: profileExtras.full_name ?? '',
      bio: profileExtras.bio ?? '',
      avatar_url: profileExtras.avatar_url ?? '',
      social_instagram: profileExtras.social_instagram ?? '',
      social_twitter: profileExtras.social_twitter ?? '',
      social_linkedin: profileExtras.social_linkedin ?? '',
      social_website: profileExtras.social_website ?? '',
    })
  }, [profileExtras, reset])

  // Certificados obtenidos
  const { data: certificates } = useQuery<CertificateRow[]>({
    queryKey: ['my-certificates', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data: certs } = await supabase
        .from('certificates')
        .select(`
          id, issued_at, verification_code,
          enrollments!inner(student_id, courses(title))
        `)
        .eq('enrollments.student_id', profile!.id)
      return (certs ?? []) as unknown as CertificateRow[]
    },
  })

  // Cursos completados
  const { data: completedCourses } = useQuery({
    queryKey: ['completed-courses', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('course_progress')
        .select('enrollment_id, progress_percent, enrollments!inner(student_id, courses(title, slug))')
        .eq('enrollments.student_id', profile!.id)
        .eq('progress_percent', 100)
      return data ?? []
    },
  })

  async function onSubmit(data: ProfileData) {
    if (!profile) return
    const update: ProfileUpdate = {
      full_name: data.full_name,
      bio: data.bio || null,
      avatar_url: data.avatar_url || null,
      social_instagram: data.social_instagram || null,
      social_twitter: data.social_twitter || null,
      social_linkedin: data.social_linkedin || null,
      social_website: data.social_website || null,
    }
    const { error } = await supabase
      .from('profiles')
      .update(update)
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Perfil actualizado')
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }

  const points = profileExtras?.points ?? 0
  const level = profileExtras?.level ?? 1
  const streak = profileExtras?.streak_days ?? 0

  // Level progress (100 pts per level)
  const levelProgress = Math.min((points % 100) / 100 * 100, 100)
  const nextLevelPts = (level) * 100

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="glass-light sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-7 w-auto object-contain" loading="lazy" decoding="async" />
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground/80">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Mi perfil</h1>
          <p className="text-muted-foreground mt-1">Tus logros y configuración personal</p>
        </div>

        {/* Stats de logros */}
        <div className="bg-white rounded-xl border border-border/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Avatar grande */}
            <div className="relative shrink-0">
              <SmartAvatar
                src={profile?.avatar_url ?? null}
                alt={profile?.full_name ?? ''}
                size={64}
                fallbackInitials={(profile?.full_name ?? 'U')[0].toUpperCase()}
                className="bg-primary/10 text-primary"
              />
              <div className="absolute -bottom-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                {level}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-semibold text-foreground text-lg truncate">{profile?.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-primary font-semibold">{points} pts</span>
                <span className="text-foreground/85">·</span>
                <StreakBadge streak={streak} size="sm" />
              </div>
            </div>
          </div>

          {/* Nivel y progreso */}
          <div className="space-y-1.5 mb-6">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">Nivel {level}</span>
              <span>{points} / {nextLevelPts} pts para nivel {level + 1}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-3 text-center">
              <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{completedCourses?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{streak}</p>
              <p className="text-xs text-muted-foreground">Días seguidos</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
              <Award className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{certificates?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Certificados</p>
            </div>
          </div>
        </div>

        {/* Certificados */}
        {certificates && certificates.length > 0 && (
          <div className="bg-white rounded-xl border border-border/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Mis certificados</h2>
            </div>
            <div className="space-y-2">
              {certificates.map(cert => {
                const courseTitle = cert.enrollments?.courses?.title ?? 'Curso'
                const issuedAt = new Date(cert.issued_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{courseTitle}</p>
                        <p className="text-xs text-muted-foreground">{issuedAt}</p>
                      </div>
                    </div>
                    <Link
                      to={`/certificates/${cert.verification_code}`}
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Ver →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Insignias de nivel */}
        <div className="bg-white rounded-xl border border-border/60 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Insignias</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Primer paso', icon: BookOpen, earned: points >= 10, color: 'green' },
              { label: 'Racha 3 días', icon: Flame, earned: streak >= 3, color: 'orange' },
              { label: '50 puntos', icon: Star, earned: points >= 50, color: 'yellow' },
              { label: 'Graduado', icon: Award, earned: (completedCourses?.length ?? 0) >= 1, color: 'purple' },
            ].map(badge => (
              <div
                key={badge.label}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  badge.earned
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-secondary/30 border-border/40 opacity-40 grayscale'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  badge.earned ? 'bg-primary/10' : 'bg-gray-100'
                }`}>
                  <badge.icon className={`w-4 h-4 ${badge.earned ? 'text-primary' : 'text-muted-foreground/80'}`} />
                </div>
                <span className="text-xs text-foreground/70 leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-xl border border-border/60 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-foreground">Foto de perfil</h2>
            <div className="flex items-center gap-6">
              <Controller
                control={control}
                name="avatar_url"
                render={({ field }) => (
                  <ImageUpload
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    bucket="avatars"
                    label=""
                    hint="JPG o PNG · Máx 2MB"
                    aspectRatio="square"
                  />
                )}
              />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground/85">Subí una foto de perfil</p>
                <p>JPG o PNG con fondo claro. Máximo 2MB.</p>
              </div>
            </div>
          </div>

          {/* Info personal */}
          <div className="bg-white rounded-xl border border-border/60 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-foreground">Información personal</h2>

            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input placeholder="Tu nombre" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Bio</Label>
                <span className={`text-xs ${bioValue.length > 450 ? 'text-orange-500' : 'text-muted-foreground/80'}`}>
                  {bioValue.length}/500
                </span>
              </div>
              <textarea
                placeholder="Contá algo sobre vos..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                {...register('bio')}
              />
              {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
            </div>
          </div>

          {/* Redes sociales */}
          <div className="bg-white rounded-xl border border-border/60 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-foreground">Redes sociales</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input placeholder="@tuusuario" {...register('social_instagram')} />
              </div>
              <div className="space-y-1.5">
                <Label>Twitter / X</Label>
                <Input placeholder="@tuusuario" {...register('social_twitter')} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input placeholder="linkedin.com/in/..." {...register('social_linkedin')} />
              </div>
              <div className="space-y-1.5">
                <Label>Sitio web</Label>
                <Input placeholder="https://tuweb.com" {...register('social_website')} />
              </div>
            </div>
          </div>

          <Button type="submit" variant="hero" disabled={isSubmitting} className="gap-2">
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </main>
    </div>
  )
}
