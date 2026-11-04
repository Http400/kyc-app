import { Button } from '@kyc/ui'
import { useCallback, useRef, useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'

export function useConfirmDiscard() {
  const [message, setMessage] = useState('')
  const resolve = useRef<(answer: boolean) => void>(undefined)
  const confirm = useCallback(
    (text: string) =>
      new Promise<boolean>((done) => {
        resolve.current = done
        setMessage(text)
      }),
    [],
  )
  function answer(value: boolean) {
    setMessage('')
    resolve.current?.(value)
    resolve.current = undefined
  }
  const dialog = (
    <ModalOverlay
      isOpen={Boolean(message)}
      onOpenChange={(open) => {
        if (!open) answer(false)
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0008',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <Modal
        style={{
          background: 'white',
          padding: 24,
          maxWidth: '90vw',
          borderRadius: 8,
        }}
      >
        <Dialog role="alertdialog">
          <Heading slot="title">Unsaved changes</Heading>
          <p>{message}</p>
          <Button autoFocus onClick={() => answer(false)}>
            Keep editing
          </Button>
          <Button onClick={() => answer(true)}>Discard changes</Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
  return { confirm, dialog }
}
