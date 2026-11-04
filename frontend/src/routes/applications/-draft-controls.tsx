import { Alert, Button } from '@kyc/ui'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { DraftFailure, logoutApplicant } from './-draft-api'

export function Failure({ error }: { error: unknown }) {
  return (
    <>
      <Alert role="alert" severity="error">
        {error instanceof Error ? error.message : 'Please try again.'}
      </Alert>
      {error instanceof DraftFailure && [401, 403].includes(error.status) ? (
        <a href="/sign-in">Sign in again</a>
      ) : null}
    </>
  )
}
export function Logout({
  disabled = false,
  beforeLogout,
  onPendingChange,
  onLoggedOut,
}: {
  disabled?: boolean
  beforeLogout?: () => boolean | Promise<boolean>
  onPendingChange?: (pending: boolean) => void
  onLoggedOut?: () => void
}) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>()
  async function logout() {
    if (lock.current) return
    lock.current = true
    if (beforeLogout && !(await beforeLogout())) {
      lock.current = false
      return
    }
    setPending(true)
    onPendingChange?.(true)
    setError(undefined)
    try {
      await logoutApplicant()
      onLoggedOut?.()
      await client.cancelQueries()
      client.clear()
      await navigate('/sign-in')
    } catch (cause) {
      setError(cause)
    } finally {
      lock.current = false
      setPending(false)
      onPendingChange?.(false)
    }
  }
  return (
    <div>
      {error ? <Failure error={error} /> : null}
      <Button
        variant="quiet"
        isDisabled={disabled || pending}
        onClick={() => void logout()}
      >
        {pending ? 'Signing out…' : 'Log out'}
      </Button>
    </div>
  )
}
