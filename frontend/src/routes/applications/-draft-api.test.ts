import { http, HttpResponse } from 'msw'
import { expect, it } from 'vitest'

import { server } from '../../test/server'

import { currentApplication, loadDraft, saveDraft } from './-draft-api'

const id = 'b9ac53c6-7526-40eb-a637-bb18ecf434af'
const path = `/api/v1/applicant-applications/${id}/form`
const attributes = {
  status: 'draft',
  currentStep: 'personal-details',
  answers: { name: 'Ada', consentConfirmed: false },
  documentEvidence: { present: false },
  version: 3,
}
const document = {
  data: { type: 'applicant-application-forms', id, attributes },
}
it('loads persisted answers and handles an absent current draft', async () => {
  server.use(
    http.get(path, () => HttpResponse.json(document)),
    http.get(
      '/api/v1/applicant-applications/current',
      () => new HttpResponse(null, { status: 204 }),
    ),
  )
  expect(await loadDraft(id)).toEqual(attributes)
  expect(await currentApplication()).toBeNull()
})
it('sends only the selected step, explicit clears, boolean consent, version and CSRF', async () => {
  window.document.cookie = 'XSRF-TOKEN=test-token; path=/'
  server.use(
    http.patch(path, async ({ request }) => {
      expect(request.headers.get('X-XSRF-TOKEN')).toBe('test-token')
      expect(request.credentials).toBe('same-origin')
      expect(request.headers.get('Content-Type')).toBe(
        'application/vnd.api+json',
      )
      expect(await request.json()).toEqual({
        data: {
          type: 'applicant-application-forms',
          id,
          attributes: {
            step: 'personal-details',
            version: 2,
            answers: {
              name: '',
              dateOfBirth: '',
              country: '',
              nationality: '',
              email: '',
              phone: '',
              consentConfirmed: false,
            },
          },
        },
      })
      return HttpResponse.json(document)
    }),
  )
  await saveDraft(
    id,
    'personal-details',
    { name: '', street: 'Preserve other step', consentConfirmed: false },
    2,
  )
})
it.each([401, 403, 404, 409, 422, 503])(
  'reports %s as a failure',
  async (status) => {
    server.use(http.patch(path, () => new HttpResponse(null, { status })))
    await expect(
      saveDraft(id, 'personal-details', {}, 2),
    ).rejects.toMatchObject({ status })
  },
)
it('rejects malformed success and network failures', async () => {
  server.use(http.get(path, () => HttpResponse.json({})))
  await expect(loadDraft(id)).rejects.toThrow('unexpected response')
  server.use(http.get(path, () => HttpResponse.error()))
  await expect(loadDraft(id)).rejects.toThrow('connection')
})
