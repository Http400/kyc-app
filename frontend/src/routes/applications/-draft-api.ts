import { z } from 'zod'

export const fields = {
  'personal-details': {
    name: 'Name',
    dateOfBirth: 'Date of birth',
    country: 'Country',
    nationality: 'Nationality',
    email: 'Email',
    phone: 'Phone',
  },
  'identity-and-address': {
    documentType: 'Document type',
    documentNumber: 'Document number',
    documentCountry: 'Document country',
    expiry: 'Expiry',
    street: 'Street',
    city: 'City',
    postal: 'Postal code',
    residentialCountry: 'Residential country',
  },
} as const
export type Step = keyof typeof fields
export type Answers = Record<string, string | boolean | null>
const step = z.enum(['personal-details', 'identity-and-address'])
const formDocument = z.object({
  data: z.object({
    type: z.literal('applicant-application-forms'),
    id: z.uuid(),
    attributes: z.object({
      status: z.literal('draft'),
      currentStep: step,
      answers: z.record(
        z.string(),
        z.union([z.string(), z.boolean(), z.null()]),
      ),
      documentEvidence: z.object({ present: z.boolean() }),
      version: z.number().int().nonnegative().optional(),
    }),
  }),
})
export type Draft = z.infer<typeof formDocument>['data']['attributes']
const applicationDocument = z.object({
  data: z.object({
    type: z.literal('applicant-applications'),
    id: z.uuid(),
    attributes: z.object({
      currentStep: step,
      progress: z.array(
        z.object({
          step,
          state: z.enum(['not-started', 'current', 'complete']),
        }),
      ),
    }),
  }),
})
export class DraftFailure extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message)
  }
}
export async function request(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.api+json' }
  if (method !== 'GET') {
    const token = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
      ?.slice(11)
    if (token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
    if (body) headers['Content-Type'] = 'application/vnd.api+json'
  }
  let encoded: BodyInit | undefined
  if (body) encoded = JSON.stringify(body)
  let response: Response
  try {
    response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: 'same-origin',
      headers,
      body: encoded,
    })
  } catch {
    throw new DraftFailure(
      'Could not reach the server. Check your connection and try again.',
    )
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Your session has expired. Sign in to continue. Leaving this page will discard unsaved changes.',
      403: 'Access denied. Sign in again and try again.',
      404: 'This application could not be found.',
      409: 'This form changed elsewhere. Reload the saved form before trying again.',
      400: 'The form could not be accepted. Check your answers and try again.',
      422: 'The form or document could not be accepted. Check your entries and try again.',
    }
    throw new DraftFailure(
      messages[response.status] ?? 'The request failed. Please try again.',
      response.status,
    )
  }
  return response
}
async function parse<T>(
  response: Response,
  schema: z.ZodType<T>,
  status: number,
): Promise<T> {
  const result = schema.safeParse(await response.json().catch(() => null))
  if (response.status !== status || !result.success)
    throw new DraftFailure(
      'The server returned an unexpected response. Please reload and try again.',
    )
  return result.data
}
export async function currentApplication(create = false) {
  const response = await request(
    create ? 'applicant-applications' : 'applicant-applications/current',
    create ? 'POST' : 'GET',
  )
  if (!create && response.status === 204) return null
  return (
    await parse(
      response,
      applicationDocument,
      create && response.status === 201 ? 201 : 200,
    )
  ).data
}
export async function loadDraft(id: string): Promise<Draft> {
  const result = await parse(
    await request(`applicant-applications/${id}/form`),
    formDocument,
    200,
  )
  if (result.data.id !== id)
    throw new DraftFailure('The server returned a different application.')
  return result.data.attributes
}
export async function saveDraft(
  id: string,
  selectedStep: Step,
  answers: Answers,
  version?: number,
): Promise<Draft> {
  const selected: Answers = Object.fromEntries(
    Object.keys(fields[selectedStep]).map((key) => [key, answers[key] ?? '']),
  )
  if (selectedStep === 'personal-details')
    selected.consentConfirmed = answers.consentConfirmed === true
  const response = await request(`applicant-applications/${id}/form`, 'PATCH', {
    data: {
      type: 'applicant-application-forms',
      id,
      attributes: { step: selectedStep, answers: selected, version },
    },
  })
  const result = await parse(response, formDocument, 200)
  if (result.data.id !== id)
    throw new DraftFailure('The server returned a different application.')
  return result.data.attributes
}
