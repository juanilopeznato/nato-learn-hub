/**
 * Confirm dialog reutilizable basado en shadcn AlertDialog.
 *
 *   <ConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="¿Eliminar curso?"
 *     description="Se va a borrar el curso y todas sus lecciones. Esta acción no se puede deshacer."
 *     confirmLabel="Sí, eliminar"
 *     destructive
 *     onConfirm={() => deleteCourse.mutate(id)}
 *   />
 *
 * Más accesible que window.confirm (foco visible, escape, screen readers OK).
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  disabled?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive,
  disabled,
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={disabled}
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={async (e) => {
              e.preventDefault()
              await onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
