import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, LogOut, Save, ArrowLeft } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

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
          <p className="text-gray-500 mt-1">Actualizá tu información personal y redes sociales</p>
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
