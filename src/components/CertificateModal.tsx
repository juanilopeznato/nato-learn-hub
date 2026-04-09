import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { Download, Award, X } from 'lucide-react'
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

        {/* Download button outside the cert */}
        <div className="flex justify-center pt-3 pb-1">
          <Button variant="hero" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Descargar certificado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
