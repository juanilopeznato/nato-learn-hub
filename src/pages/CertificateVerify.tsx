import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Award } from 'lucide-react'

export default function CertificateVerify() {
  const { code } = useParams<{ code: string }>()

  const { data: certificate, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify', code],
    enabled: !!code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`*, enrollment:enrollments(course_id, student:profiles(full_name), course:courses(title, tenant:tenants(name, logo_url)))`)
        .eq('verification_code', code!)
        .single()
      if (error) throw error
      return data
    },
    retry: false,
  })

  const enrollment = certificate?.enrollment as any
  const student = enrollment?.student
  const course = enrollment?.course
  const school = course?.tenant

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8">
        {school?.logo_url ? (
          <img src={school.logo_url} alt={school.name} className="h-10 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <Award className="w-7 h-7 text-primary" />
            <span className="font-heading text-xl font-bold text-gray-800">
              {school?.name ?? 'NATO University'}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Verificando certificado...</p>
          </div>
        ) : (isError || !certificate) ? (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <XCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="font-heading text-xl font-bold text-gray-900">Certificado inválido</h1>
            <p className="text-gray-500 text-sm">
              Certificado no encontrado o inválido. El código de verificación no coincide con ningún certificado emitido.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <span className="inline-block bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                Certificado verificado
              </span>
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                {student?.full_name ?? 'Estudiante'}
              </h1>
              <p className="text-gray-500 mt-1 text-sm">completó satisfactoriamente el curso</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-heading font-semibold text-gray-900 text-lg">
                {course?.title ?? '—'}
              </p>
              <p className="text-sm text-gray-500">
                Emitido por <span className="font-medium text-gray-700">{school?.name ?? 'NATO University'}</span>
              </p>
              {certificate.issued_at && (
                <p className="text-xs text-gray-400">
                  Fecha de emisión:{' '}
                  {new Date(certificate.issued_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400">
                Código de verificación:{' '}
                <span className="font-mono text-gray-600">{code}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Powered by{' '}
        <Link to="/" className="hover:text-gray-600 transition-colors">NATO University</Link>
      </p>
    </div>
  )
}
