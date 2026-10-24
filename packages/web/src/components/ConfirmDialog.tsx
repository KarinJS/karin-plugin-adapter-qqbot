import { Button, Modal } from '@heroui/react'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  isPending?: boolean
  onConfirm: () => void
}

export const ConfirmDialog = ({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
}: ConfirmDialogProps) => (
  <Modal>
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className='max-w-md'>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className='text-sm leading-6 text-muted'>{description}</Modal.Body>
          <Modal.Footer>
            <Button variant='secondary' isDisabled={isPending} onPress={() => onOpenChange(false)}>
              取消
            </Button>
            <Button variant='danger' isPending={isPending} onPress={onConfirm}>
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
)
