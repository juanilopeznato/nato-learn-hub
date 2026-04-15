import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { Download, Award, X, Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  studentName: string
  courseTitle: string
  tenantName: string
  verificationCode: string
  issuedAt: string
}

export function CertificateModal({ open, onClose, studentName, courseTitle, tenantName, verificationCode, issuedAt }: Props) {
  const certRef = useRef<HTMLDivElement>(null)

  async function handleDownload() {
    if (!certRef.current) return
    const dataUrl = await toPng(certRef.current, { pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = `certificado-${courseTitle.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = dataUrl
    link.click()
  }

  const dateStr = new Date(issuedAt).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
  const issuedDate = new Date(issuedAt)
  const verificationUrl = `${window.location.origin}/certificates/${verificationCode}`

  function handleLinkedIn() {
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: courseTitle,
      organizationName: tenantName,
      issueYear: String(issuedDate.getFullYear()),
      issueMonth: String(issuedDate.getMonth() + 1),
      certUrl: verificationUrl,
      certId: verificationCode,
    })
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  function handleWhatsApp() {
    const text = `¡Completé el curso "${courseTitle}" en ${tenantName}! 🎓\nPodés verificar mi certificado acá: ${verificationUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-transparent border-0 shadow-none">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-white/80 hover:bg-white text-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Certificate */}
        <div ref={certRef} className="bg-white relative overflow-hidden" style={{ fontFamily: 'Georgia, serif' }}>
          {/* Background decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
            <div className="absolute top-2 left-0 bottom-2 w-2 bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-500" />
            <div className="absolute top-2 right-0 bottom-2 w-2 bg-gradient-to-b from-yellow-500 via-yellow-400 to-yellow-500" />
            {/* Corner ornaments */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-yellow-400/40 rounded-tl-sm" />
            <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-yellow-400/40 rounded-tr-sm" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-yellow-400/40 rounded-bl-sm" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-yellow-400/40 rounded-br-sm" />
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }}
            />
          </div>

          <div className="relative px-16 py-12 text-center space-y-6">
            {/* Header */}
            <div className="flex items-center justify-center gap-3">
              <Award className="w-8 h-8 text-yellow-500" />
              <span className="text-sm font-sans tracking-[0.3em] uppercase text-gray-400">{tenantName}</span>
              <Award className="w-8 h-8 text-yellow-500" />
            </div>

            <div>
              <p className="text-xs font-sans tracking-[0.4em] uppercase text-gray-400 mb-1">Certificado de finalización</p>
              <div className="w-24 h-px bg-yellow-400 mx-auto" />
            </div>

            <div>
              <p className="text-sm font-sans text-gray-500 mb-2">Se certifica que</p>
              <h2 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>{studentName}</h2>
            </div>

            <div>
              <p className="text-sm font-sans text-gray-500 mb-2">completó satisfactoriamente el curso</p>
              <h3 className="text-2xl font-semibold text-gray-800 leading-tight">{courseTitle}</h3>
            </div>

            <div className="w-32 h-px bg-gray-200 mx-auto" />

            <div className="flex items-end justify-between pt-2">
              <div className="text-left">
                <p className="text-xs font-sans text-gray-400">Fecha de emisión</p>
                <p className="text-sm font-sans text-gray-600 font-medium">{dateStr}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-1 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <p className="text-xs font-sans text-gray-400">{tenantName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-sans text-gray-400">Código de verificación</p>
                <p className="text-sm font-sans text-gray-600 font-medium tracking-widest">{verificationCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones fuera del cert */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3 pb-1">
          <Button variant="hero" onClick={handleDownload} className="gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Descargar
          </Button>
          <Button
            variant="outline"
            onClick={handleLinkedIn}
            className="gap-2 w-full sm:w-auto border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            Agregar a LinkedIn
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsApp}
            className="gap-2 w-full sm:w-auto border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
          >
            {/* WhatsApp icon SVG inline */}
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Compartir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
