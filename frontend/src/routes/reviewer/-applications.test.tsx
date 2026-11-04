import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense, type ComponentProps } from 'react'
import { createMemoryRouter, RouterProvider, useLoaderData } from 'react-router'
import { expect, describe, it, vi } from 'vitest'

import ReviewerApplicationsPage, {
  clientLoader,
  parseReviewerApplicationsSearch,
  ReviewerApplicationsView,
  type ReviewerApplicationsResponse,
} from './applications'

const response = {
  kind: 'found',
  result: {
    summary: { pendingReview: 2, inProgress: 3, approvedThisMonth: 1 },
    pagination: { page: 0, pageSize: 10, totalItems: 1, totalPages: 1 },
    applications: [
      {
        id: '0199a8bb-8687-7c22-aed5-55d432f50f23',
        applicantName: 'Ada Lovelace',
        submittedAt: '2026-09-24T10:30:00Z',
        status: 'in-review',
      },
    ],
  },
} satisfies ReviewerApplicationsResponse

function renderRoute(
  initialEntry: string,
  beforeLoad?: (request: Request) => Promise<void>,
  beforeCommit?: (query: string) => void,
) {
  function CommitGate({ query }: { query: string }) {
    beforeCommit?.(query)
    return null
  }
  const router = createMemoryRouter(
    [
      {
        path: '/reviewer/applications',
        loader: async ({ request }) => {
          await beforeLoad?.(request)
          const data = await clientLoader({ request } as Parameters<
            typeof clientLoader
          >[0])
          return {
            ...data,
            response: {
              ...response,
              result: {
                ...response.result,
                pagination: {
                  page: data.page,
                  pageSize: 10,
                  totalItems: 30,
                  totalPages: 3,
                },
              },
            },
          }
        },
        Component: function TestRoute() {
          const loaderData = useLoaderData<typeof clientLoader>()
          return (
            <>
              <ReviewerApplicationsPage
                loaderData={loaderData}
                // Framework-only metadata is unused by this page.
                {...({} as Omit<
                  ComponentProps<typeof ReviewerApplicationsPage>,
                  'loaderData'
                >)}
              />
              <CommitGate query={loaderData.q} />
            </>
          )
        },
        HydrateFallback: () => null,
      },
    ],
    { initialEntries: [initialEntry] },
  )
  const view = render(
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>,
  )
  return { router, ...view }
}

async function expectRouteSearch(
  router: ReturnType<typeof createMemoryRouter>,
  expected: { q: string; status: string; page: string },
) {
  await waitFor(() => {
    expect(router.state.navigation.state).toBe('idle')
    expect(
      Object.fromEntries(new URLSearchParams(router.state.location.search)),
    ).toEqual(expected)
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue(
      expected.q,
    )
  })
}

describe('Reviewer applications route', () => {
  it('preserves a newer edit when an older navigation commits', async () => {
    // Hold one rendered navigation until the next keystroke has started a
    // second loader, then let the older render commit first.
    const user = userEvent.setup()
    let releaseCommit!: () => void
    let releaseLoader!: () => void
    let holdCommit = true
    const commit = new Promise<void>((resolve) => {
      releaseCommit = resolve
    })
    const loader = new Promise<void>((resolve) => {
      releaseLoader = resolve
    })
    const reachedCommit = vi.fn()
    const reachedLoader = vi.fn()
    const { router } = renderRoute(
      '/reviewer/applications?q=Ada%20Lo&status=all&page=0',
      async (request) => {
        if (new URL(request.url).searchParams.get('q') === 'Ada Love') {
          reachedLoader()
          await loader
        }
      },
      (query) => {
        if (query === 'Ada Lov' && holdCommit) {
          reachedCommit()
          throw commit
        }
      },
    )
    await expectRouteSearch(router, { q: 'Ada Lo', status: 'all', page: '0' })
    const input = screen.getByRole('textbox', { name: 'Search' })
    try {
      await user.type(input, 'v')
      await waitFor(() => expect(reachedCommit).toHaveBeenCalled())
      await user.type(input, 'e')
      await waitFor(() => expect(reachedLoader).toHaveBeenCalled())
      expect(input).toHaveValue('Ada Love')
      await act(async () => {
        holdCommit = false
        releaseCommit()
        await commit
      })
      expect(input).toHaveValue('Ada Love')
      expect(input).toHaveFocus()
      await act(async () => {
        releaseLoader()
        await loader
      })
      await user.type(input, 'lace')
      await expectRouteSearch(router, {
        q: 'Ada Lovelace',
        status: 'all',
        page: '0',
      })
      expect(screen.getByRole('textbox', { name: 'Search' })).toBe(input)
    } finally {
      holdCommit = false
      releaseCommit()
      releaseLoader()
    }
  })

  it('synchronizes direct navigation and back/forward history, including empty search', async () => {
    const { router } = renderRoute(
      '/reviewer/applications?q=Ada&status=all&page=1',
    )
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '1' })
    await act(() =>
      router.navigate('/reviewer/applications?q=&status=in-review&page=0'),
    )
    await expectRouteSearch(router, { q: '', status: 'in-review', page: '0' })
    await act(() => router.navigate(-1))
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '1' })
    await act(() => router.navigate(1))
    await expectRouteSearch(router, { q: '', status: 'in-review', page: '0' })
  })

  it('keeps the complete draft and focus while navigation is pending', async () => {
    const user = userEvent.setup()
    let pending = Promise.resolve()
    const { router } = renderRoute(
      '/reviewer/applications?q=&status=all&page=2',
      () => pending,
    )
    await expectRouteSearch(router, { q: '', status: 'all', page: '2' })
    let release!: () => void
    pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const input = screen.getByRole('textbox', { name: 'Search' })
    await user.type(input, 'Ada')
    expect(input).toHaveValue('Ada')
    expect(input).toHaveFocus()
    expect(router.state.navigation.state).toBe('loading')
    await act(async () => {
      release()
      await pending
    })
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '0' })
    expect(screen.getByRole('textbox', { name: 'Search' })).toBe(input)
    expect(input).toHaveFocus()
    await user.type(input, ' Lovelace')
    await expectRouteSearch(router, {
      q: 'Ada Lovelace',
      status: 'all',
      page: '0',
    })
  })

  it('restores queries from local edits when navigating back and forward', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(
      '/reviewer/applications?q=Ada&status=all&page=0',
    )
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '0' })
    const input = screen.getByRole('textbox', { name: 'Search' })
    await user.type(input, 'L')
    await expectRouteSearch(router, { q: 'AdaL', status: 'all', page: '0' })
    await user.type(input, 'o')
    await expectRouteSearch(router, { q: 'AdaLo', status: 'all', page: '0' })
    await act(() => router.navigate(-1))
    await expectRouteSearch(router, { q: 'AdaL', status: 'all', page: '0' })
    await act(() => router.navigate(1))
    await expectRouteSearch(router, { q: 'AdaLo', status: 'all', page: '0' })
    await user.clear(input)
    await expectRouteSearch(router, { q: '', status: 'all', page: '0' })
    expect(screen.getByRole('textbox', { name: 'Search' })).toBe(input)
    expect(input).toHaveFocus()
    await act(() =>
      router.navigate('/reviewer/applications?q=Grace&status=approved&page=1'),
    )
    await expectRouteSearch(router, {
      q: 'Grace',
      status: 'approved',
      page: '1',
    })
  })

  it('clears search, status, and pagination together', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(
      '/reviewer/applications?q=missing&status=approved&page=2',
    )
    await expectRouteSearch(router, {
      q: 'missing',
      status: 'approved',
      page: '2',
    })
    await user.click(
      screen.getByRole('button', { name: 'Clear search and status' }),
    )
    await expectRouteSearch(router, { q: '', status: 'all', page: '0' })
    await act(() => router.navigate(-1))
    await expectRouteSearch(router, {
      q: 'missing',
      status: 'approved',
      page: '2',
    })
  })

  it('resets pagination for search and status, and preserves filters when paging', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(
      '/reviewer/applications?q=Ad&status=all&page=2',
    )
    await expectRouteSearch(router, { q: 'Ad', status: 'all', page: '2' })
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'a')
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '0' })
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await expectRouteSearch(router, { q: 'Ada', status: 'all', page: '1' })
    await user.click(
      screen.getByRole('button', { name: 'All statuses Status' }),
    )
    await user.click(screen.getByRole('option', { name: 'In review' }))
    await expectRouteSearch(router, {
      q: 'Ada',
      status: 'in-review',
      page: '0',
    })
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await expectRouteSearch(router, {
      q: 'Ada',
      status: 'in-review',
      page: '1',
    })
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await expectRouteSearch(router, {
      q: 'Ada',
      status: 'in-review',
      page: '0',
    })
  })
})

describe('Reviewer applications overview', () => {
  it('validates route search values and supplies first-page defaults', () => {
    expect(
      parseReviewerApplicationsSearch({
        q: 'Ada',
        status: 'approved',
        page: 2,
      }),
    ).toEqual({ q: 'Ada', status: 'approved', page: 2 })
    expect(
      parseReviewerApplicationsSearch({
        q: 'x'.repeat(121),
        status: 'unknown',
        page: -1,
      }),
    ).toEqual({ q: '', status: 'all', page: 0 })
    expect(parseReviewerApplicationsSearch({})).toEqual({
      q: '',
      status: 'all',
      page: 0,
    })
  })

  it('shows workload metrics, readable status, submission date, and detail action', () => {
    render(
      <ReviewerApplicationsView
        response={response}
        q=""
        status="all"
        page={0}
        onSearch={vi.fn()}
        onStatus={vi.fn()}
        onPage={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Applications' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Pending review').parentElement).toHaveTextContent(
      '2',
    )
    expect(screen.getByText('In progress').parentElement).toHaveTextContent('3')
    expect(
      screen.getByText('Approved this month').parentElement,
    ).toHaveTextContent('1')
    expect(screen.getAllByText('In review')).toHaveLength(2)
    expect(screen.getByText('Sep 24, 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      `/reviewer/applications/${response.kind === 'found' ? response.result.applications[0]!.id : ''}`,
    )
  })

  it('keeps search, status, and pagination controls keyboard accessible', async () => {
    const user = userEvent.setup()
    const onSearch = vi.fn()
    const onStatus = vi.fn()
    const onPage = vi.fn()
    const multiPage: ReviewerApplicationsResponse = {
      ...response,
      result: {
        ...response.result,
        pagination: {
          ...response.result.pagination,
          totalItems: 21,
          totalPages: 3,
        },
      },
    }
    render(
      <ReviewerApplicationsView
        response={multiPage}
        q=""
        status="all"
        page={0}
        onSearch={onSearch}
        onStatus={onStatus}
        onPage={onPage}
        onClearFilters={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'Ada')
    await user.click(
      screen.getByRole('button', { name: 'All statuses Status' }),
    )
    await user.click(screen.getByRole('option', { name: 'In review' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onSearch).toHaveBeenLastCalledWith('a')
    expect(onStatus).toHaveBeenCalledWith('in-review')
    expect(onPage).toHaveBeenCalledWith(1)
  })

  it('explains empty results and lets staff clear filters', async () => {
    const user = userEvent.setup()
    const onClearFilters = vi.fn()
    const onSearch = vi.fn()
    const onStatus = vi.fn()
    const empty: ReviewerApplicationsResponse = {
      ...response,
      result: { ...response.result, applications: [] },
    }
    render(
      <ReviewerApplicationsView
        response={empty}
        q="Ada"
        status="approved"
        page={0}
        onSearch={onSearch}
        onStatus={onStatus}
        onPage={vi.fn()}
        onClearFilters={onClearFilters}
      />,
    )
    expect(
      screen.getByText('No applications match these filters.'),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Clear search and status' }),
    )
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it('shows denial and API error without application data', () => {
    const denied = render(
      <ReviewerApplicationsView
        response={{ kind: 'denied' }}
        q=""
        status="all"
        page={0}
        onSearch={vi.fn()}
        onStatus={vi.fn()}
        onPage={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You do not have access',
    )
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    denied.unmount()
    render(
      <ReviewerApplicationsView
        response={{ kind: 'error' }}
        q=""
        status="all"
        page={0}
        onSearch={vi.fn()}
        onStatus={vi.fn()}
        onPage={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Applications could not be loaded',
    )
  })
})
