import { Alert, Button, Stack, TextField, Typography } from '@kyc/ui'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router'

import styles from '../application-step.module.css'

import { useConfirmDiscard } from './-confirm-discard'
import {
  type Answers,
  type Draft,
  DraftFailure,
  fields,
  loadDraft,
  saveDraft,
  type Step,
  uploadEvidence,
} from './-draft-api'
import { Failure, Logout } from './-draft-controls'

const inputPurposes: Record<string, string> = {
  name: 'name',
  dateOfBirth: 'bday',
  email: 'email',
  phone: 'tel',
  street: 'street-address',
  city: 'address-level2',
  postal: 'postal-code',
  residentialCountry: 'country-name',
}

export function DraftPage({ id, step }: { id: string; step: Step }) {
  const query = useQuery({
    queryKey: ['applicant', id, 'form'],
    queryFn: () => loadDraft(id),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  })
  if (query.isPending || query.isFetching)
    return <p role="status">Loading saved answers…</p>
  if (query.error)
    return (
      <main>
        <Failure error={query.error} />
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </main>
    )
  return (
    <DraftForm key={`${id}/${step}`} id={id} step={step} initial={query.data} />
  )
}
function DraftForm({
  id,
  step,
  initial,
}: {
  id: string
  step: Step
  initial: Draft
}) {
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirmDiscard()
  const [draft, setDraft] = useState(initial)
  const [answers, setAnswers] = useState<Answers>(initial.answers)
  const [file, setFile] = useState<File>()
  const [pending, setPending] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const busy = pending || loggingOut
  const [saved, setSaved] = useState(false)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<unknown>()
  const [partial, setPartial] = useState('')
  const [refreshNeeded, setRefreshNeeded] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')
  const editingDisabled = busy || refreshNeeded
  const lock = useRef(false)
  const leaving = useRef(false)
  const picker = useRef<HTMLInputElement>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const dirty =
    Boolean(file) || JSON.stringify(answers) !== JSON.stringify(draft.answers)
  const blocker = useBlocker(() => !leaving.current && (dirty || lock.current))
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (lock.current) {
      blocker.reset()
      return
    }
    void confirm('Discard unsaved changes and leave this page?').then(
      (discard) => {
        if (discard) blocker.proceed()
        else blocker.reset()
      },
    )
  }, [blocker, confirm])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || lock.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (error) feedback.current?.focus()
  }, [error])
  function edit(key: string, value: string | boolean) {
    setAnswers((current) => ({ ...current, [key]: value }))
    setSaved(false)
    setRefreshMessage('')
    setMissing(false)
  }
  async function reload() {
    if (
      lock.current ||
      !(await confirm('Discard unsaved changes and reload the saved form?'))
    )
      return
    lock.current = true
    setPending(true)
    try {
      const result = await loadDraft(id)
      setDraft(result)
      setAnswers(result.answers)
      setFile(undefined)
      if (picker.current) picker.current.value = ''
      setError(undefined)
      setPartial('')
      setSaved(false)
      setRefreshNeeded(false)
    } catch (cause) {
      setError(cause)
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  async function retryRefresh() {
    if (lock.current || loggingOut) return
    lock.current = true
    setPending(true)
    setError(undefined)
    try {
      const latest = await loadDraft(id)
      setDraft(latest)
      setAnswers(latest.answers)
      setRefreshNeeded(false)
      setPartial('')
      setRefreshMessage(
        'Latest saved draft loaded. Review it before continuing.',
      )
    } catch (cause) {
      setError(cause)
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  async function save(advance: boolean) {
    if (lock.current || loggingOut || refreshNeeded) return
    lock.current = true
    setPending(true)
    setSaved(false)
    setRefreshMessage('')
    setError(undefined)
    setPartial('')
    setMissing(false)
    let answersSaved = false
    let evidenceUploaded = false
    try {
      const result = await saveDraft(id, step, answers, draft.version)
      answersSaved = true
      setDraft(result)
      setAnswers(result.answers)
      if (file) {
        await uploadEvidence(id, file)
        evidenceUploaded = true
        setFile(undefined)
        if (picker.current) picker.current.value = ''
        setRefreshNeeded(true)
        const updated = await loadDraft(id)
        setDraft(updated)
        setAnswers(updated.answers)
        setRefreshNeeded(false)
      }
      setSaved(true)
      if (advance) {
        leaving.current = true
        await navigate(
          `/applications/${id}/${step === 'personal-details' ? 'identity-and-address' : 'review'}`,
        )
      }
    } catch (cause) {
      setError(cause)
      if (answersSaved)
        setPartial(
          evidenceUploaded
            ? 'Your answers and document were saved, but the latest draft could not be loaded. Retry refresh before editing or continuing.'
            : 'Your answers were saved, but the document operation did not finish. Retry Save before continuing.',
        )
    } finally {
      lock.current = false
      setPending(false)
    }
  }
  return (
    <main className={styles.page}>
      {dialog}
      <div className={styles.stepContent}>
        <Logout
          disabled={busy}
          onPendingChange={setLoggingOut}
          onLoggedOut={() => {
            leaving.current = true
          }}
          beforeLogout={async () =>
            !dirty || (await confirm('Discard unsaved changes and log out?'))
          }
        />
        <Typography component="h1" variant="heading">
          {step === 'personal-details'
            ? 'Personal details'
            : 'Identity and address'}
        </Typography>
        <p role="status" aria-live="polite">
          {pending
            ? 'Saving or refreshing your draft…'
            : (saved && 'Your progress was saved.') || refreshMessage}
        </p>
        {missing ? (
          <Alert role="alert" severity="error">
            Complete all required fields before continuing.
          </Alert>
        ) : null}
        {partial ? <p>{partial}</p> : null}
        {refreshNeeded ? (
          <Button isDisabled={busy} onClick={() => void retryRefresh()}>
            Retry refresh
          </Button>
        ) : null}
        {error ? (
          <div ref={feedback} tabIndex={-1}>
            <Failure error={error} />
            {error instanceof DraftFailure && error.status === 409 ? (
              <Button isDisabled={busy} onClick={() => void reload()}>
                Reload saved form
              </Button>
            ) : null}
          </div>
        ) : null}
        <Stack
          component="form"
          spacing={2}
          aria-busy={busy}
          onSubmit={(event) => {
            event.preventDefault()
            if (editingDisabled) return
            if (!event.currentTarget.reportValidity()) {
              setMissing(true)
              event.currentTarget
                .querySelector<HTMLInputElement>('input:invalid')
                ?.focus()
              return
            }
            void save(true)
          }}
        >
          {Object.entries(fields[step]).map(([key, label]) => (
            <TextField
              key={key}
              name={key}
              autoComplete={inputPurposes[key]}
              label={`${label} (required)`}
              required
              disabled={editingDisabled}
              value={
                typeof answers[key] === 'string' ? (answers[key] as string) : ''
              }
              onChange={(event) => edit(key, event.target.value)}
            />
          ))}
          {step === 'personal-details' ? (
            <label>
              <input
                type="checkbox"
                required
                disabled={editingDisabled}
                checked={answers.consentConfirmed === true}
                onChange={(event) =>
                  edit('consentConfirmed', event.target.checked)
                }
              />{' '}
              I confirm these details are accurate and belong to me.
            </label>
          ) : (
            <>
              <p>
                {draft.documentEvidence.present
                  ? 'Document evidence is saved. You may replace it.'
                  : 'No document evidence saved yet.'}
              </p>
              <label htmlFor="document-evidence">
                Document evidence (JPG or PNG, up to 10 MiB)
              </label>
              <input
                ref={picker}
                id="document-evidence"
                type="file"
                accept="image/jpeg,image/png"
                required={!draft.documentEvidence.present}
                disabled={editingDisabled}
                onChange={(event) => {
                  setFile(event.target.files?.[0])
                  setSaved(false)
                }}
              />
            </>
          )}
          <Stack direction="row" spacing={2} className={styles.formActions}>
            <Button
              type="button"
              variant="quiet"
              isDisabled={busy}
              onClick={() =>
                void navigate(
                  step === 'personal-details'
                    ? '/applications/current'
                    : `/applications/${id}/personal-details`,
                )
              }
            >
              Back
            </Button>
            <Button
              type="button"
              isDisabled={editingDisabled}
              onClick={() => void save(false)}
            >
              Save
            </Button>
            <Button type="submit" isDisabled={editingDisabled}>
              {step === 'personal-details' ? 'Continue' : 'Save and review'}
            </Button>
          </Stack>
        </Stack>
      </div>
    </main>
  )
}
