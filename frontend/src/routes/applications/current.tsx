import { Button } from '@kyc/ui'
import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { ApplicantJourneyPresentation } from './-applicant-journey-presentation'
import { currentApplication } from './-draft-api'
import { Failure, Logout } from './-draft-controls'

export default function CurrentApplicationJourneyPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['applicant', 'current'],
    queryFn: () => currentApplication(),
    retry: false,
    staleTime: 0,
  })
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>()
  async function start() {
    if (lock.current) return
    lock.current = true
    setPending(true)
    setError(undefined)
    try {
      const application = query.data ?? (await currentApplication(true))
      if (application)
        await navigate(
          `/applications/${application.id}/${application.attributes.currentStep}`,
        )
    } catch (cause) {
      setError(cause)
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  if (query.isPending) return <p role="status">Loading your application…</p>
  if (query.error)
    return (
      <main>
        <Failure error={query.error} />
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </main>
    )
  return (
    <>
      <Logout disabled={pending} />
      {error ? <Failure error={error} /> : null}
      <p role="status">{pending ? 'Opening your application…' : ''}</p>
      <ApplicantJourneyPresentation
        entryState={query.data ? 'resume' : 'start'}
        progress={
          query.data
            ? query.data.attributes.progress.map(({ step, state }) => ({
                step,
                state: state === 'not-started' ? 'remaining' : state,
              }))
            : [
                { step: 'personal-details', state: 'current' },
                { step: 'identity-and-address', state: 'remaining' },
              ]
        }
        onPrimaryAction={() => void start()}
      />
    </>
  )
}
