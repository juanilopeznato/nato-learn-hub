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

export default function ProfileSettings() {
  const { profile, tenant, signOut } = useAuth()
  const queryClient = useQueryClient()

  const { control, register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  })

  const bioValue = watch('bio') ?? ''

  useEffect(() => {
    if (!profile) return
    reset({
      full_name: profile.full_name ?? '',
      bio: (profile as any).bio ?? '',
      avatar_url: profile.avatar_url ?? '',
      social_instagram: (profile as any).social_instagram ?? '',
      social_twitter: (profile as any).social_twitter ?? '',
      social_linkedin: (profile as any).social_linkedin ?? '',
      social_website: (profile as any).social_website ?? '',
    })
  }, [profile, reset])

  // Certificados obtenidos
  const { data: certificates } = useQuery({
    queryKey: ['my-certificates', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('certificates')
        .select('id, issued_at, verification_code, enrollment_id, enrollments(courses(title))')
        .eq('enrollment_id', supabase.from('enrollments').select('id').eq('student_id', profile!.id) as any)
      // Simpler approach: join through enrollments
      const { data: certs } = await supabase
        .from('certificates')
        .select(`
          id, issued_at, verification_code,
          enrollments!inner(student_id, courses(title))
        `)
        .eq('enrollments.student_id', profile!.id)
      return certs ?? []
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
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        bio: data.bio || null,
        avatar_url: data.avatar_url || null,
        social_instagram: data.social_instagram || null,
        social_twitter: data.social_twitter || null,
        social_linkedin: data.social_linkedin || null,
        social_website: data.social_website || null,
      } as any)
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Perfil actualizado')
    queryClient.invalidateQueries({ queryKey: ['profile'] })
  }

  const points = (profile as any)?.points ?? 0
  const level = (profile as any)?.level ?? 1
  const streak = (profile as any)?.streak_days ?? 0

  // Level progress (100 pts per level)
  const levelProgress = Math.min((points % 100) / 100 * 100, 100)
  const nextLevelPts = (level) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-gray-500">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <img src={tenant?.logo_url ?? '/nato-logo.png'} alt={tenant?.name ?? 'NATO University'} className="h-7 w-auto object-contain" />
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-gray-400">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">Mi perfil</h1>
          <p className="text-gray-500 mt-1">Tus logros y configuración personal</p>
        </div>

        {/* Stats de logros */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
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
              <h2 className="font-heading font-semibold text-gray-900 text-lg truncate">{profile?.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-primary font-semibold">{points} pts</span>
                <span className="text-gray-300">·</span>
                <StreakBadge streak={streak} size="sm" />
              </div>
            </div>
          </div>

          {/* Nivel y progreso */}
          <div className="space-y-1.5 mb-6">
            <div className="flex justify-between text-xs text-gray-500">
              <span className="font-medium">Nivel {level}</span>
              <span>{points} / {nextLevelPts} pts para nivel {level + 1}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
              <p className="text-lg font-bold text-gray-900">{completedCourses?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Completados</p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{streak}</p>
              <p className="text-xs text-gray-500">Días seguidos</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-center">
              <Award className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-gray-900">{certificates?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Certificados</p>
            </div>
          </div>
        </div>

        {/* Certificados */}
        {certificates && certificates.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              <h2 className="font-heading font-semibold text-gray-900">Mis certificados</h2>
            </div>
            <div className="space-y-2">
              {certificates.map((cert: any) => {
                const courseTitle = cert.enrollments?.courses?.title ?? 'Curso'
                const issuedAt = new Date(cert.issued_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{courseTitle}</p>
                        <p className="text-xs text-gray-500">{issuedAt}</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-gray-900">Insignias</h2>
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
                    : 'bg-gray-50 border-gray-100 opacity-40 grayscale'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  badge.earned ? 'bg-primary/10' : 'bg-gray-100'
                }`}>
                  <badge.icon className={`w-4 h-4 ${badge.earned ? 'text-primary' : 'text-gray-400'}`} />
                </div>
                <span className="text-xs text-gray-600 leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-gray-900">Foto de perfil</h2>
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
              <div className="text-sm text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">Subí una foto de perfil</p>
                <p>JPG o PNG con fondo claro. Máximo 2MB.</p>
              </div>
            </div>
          </div>

          {/* Info personal */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-gray-900">Información personal</h2>

            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input placeholder="Tu nombre" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Bio</Label>
                <span className={`text-xs ${bioValue.length > 450 ? 'text-orange-500' : 'text-gray-400'}`}>
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
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-heading font-semibold text-gray-900">Redes sociales</h2>

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
