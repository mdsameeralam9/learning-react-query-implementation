import {
  DEFAULT_GC_TIME,
  DEFAULT_STALE_TIME,
  FIRST_FETCH_SUCCESS_BACKGROUND_FETCH_BUFFER_WINDOW_MS,
  FORCE_STALE_TIME,
} from './constants'
import { getDifferenceInMs, handlePromise } from './utils'

export class QueryCache {
  constructor(config) {
    this.cache = new Map()
    this.promisesInFlight = new Map()
    this.subscribers = new Map()
    this.gcTimeouts = new Map()
    this.gcQueue = new Set()

    this.gcTime = config?.gcTime ?? DEFAULT_GC_TIME
    this.staleTime = config?.staleTime ?? DEFAULT_STALE_TIME
  }

  subscribe(queryKey, callback) {
    const subscribers = this.subscribers.get(queryKey) || new Set()
    subscribers.add(callback)
    this.subscribers.set(queryKey, subscribers)

    return () => this.unsubscribe(queryKey, callback)
  }

  unsubscribe(queryKey, callback) {
    const subscribers = this.subscribers.get(queryKey)
    if (subscribers) {
      subscribers.delete(callback)

      if (this.getSubscriberCount({ queryKey }) === 0) {
        this.subscribers.delete(queryKey)
        this.gcQueue.add(queryKey)
        this.scheduleGC({ queryKey })
      }
    }
  }

  getState({ queryKey }) {
    const entry = this.cache.get(queryKey)
    return entry?.state
  }

  getCacheEntry({ queryKey }) {
    return this.cache.get(queryKey)
  }

  clear() {
    this.cache.clear()
    this.promisesInFlight.clear()
    this.subscribers.clear()
    this.gcTimeouts.clear()
    this.gcQueue.clear()
  }

  hasQuery({ queryKey }) {
    return this.cache.has(queryKey)
  }

  setData({ queryKey, data }) {
    const entry = this.cache.get(queryKey)

    this.setAndNotifySubscribers({
      queryKey,
      state: {
        status: 'success',
        data,
        error: null,
        lastUpdatedAt: Date.now(),
      },
      queryFn: entry?.queryFn,
    })
  }

  set({ queryKey, state, queryFn }) {
    this.cache.set(queryKey, { state, queryFn })
  }

  notifySubscribers(queryKey) {
    const subscribers = this.subscribers.get(queryKey)
    if (subscribers) {
      subscribers.forEach((callback) => callback())
    }
  }

  setAndNotifySubscribers({ queryKey, state, queryFn }) {
    this.set({ queryKey, state, queryFn })
    this.notifySubscribers(queryKey)
  }

  refetchQuery({ queryKey }) {
    const entry = this.cache.get(queryKey)
    if (!entry?.queryFn) {
      throw new Error(`No queryFn found for queryKey: ${queryKey}`)
    }

    return this.directQuery({ queryKey, queryFn: entry.queryFn })
  }

  async fetchQuery({ queryKey, queryFn, initialData }) {
    const entry = this.cache.get(queryKey)

    if (!entry) {
      await this.directQuery({ queryKey, queryFn, initialData })
    } else {
      await this.backgroundQuery({ queryKey, queryFn })
    }
  }

  async backgroundQuery({ queryKey, queryFn }) {
    const promiseInFlight = this.promisesInFlight.get(queryKey)
    const entry = this.cache.get(queryKey)

    if (promiseInFlight || !entry) {
      return
    }

    const isNotInAnySuccessStates =
      entry.state.status !== 'success' && entry.state.status !== 'first-success'
    const isFetching = entry.state.status === 'fetching'
    if (isNotInAnySuccessStates || isFetching) return

    const differenceInMs = getDifferenceInMs({
      startTime: entry.state.lastUpdatedAt,
      endTime: Date.now(),
    })

    const isStale = differenceInMs > this.staleTime

    if (!isStale) {
      return
    }

    const isFirstFetchSuccessForQuery = entry.state.status === 'first-success'
    const isFirstFetchWithinBufferWindow =
      differenceInMs < FIRST_FETCH_SUCCESS_BACKGROUND_FETCH_BUFFER_WINDOW_MS
    if (isFirstFetchSuccessForQuery && isFirstFetchWithinBufferWindow) {
      return
    }

    const prevLastUpdatedAt = entry.state.lastUpdatedAt

    this.setAndNotifySubscribers({
      queryKey,
      state: {
        status: 'fetching',
        data: entry.state.data,
        error: null,
        lastUpdatedAt: Date.now(),
      },
    })

    const promise = queryFn()
    this.promisesInFlight.set(queryKey, promise)

    const [data, error] = await handlePromise({
      promise,
      finallyCb: () => {
        this.promisesInFlight.delete(queryKey)
      },
    })

    if (error) {
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: 'success',
          error: null,
          data: entry.state.data,
          lastUpdatedAt: prevLastUpdatedAt,
        },
        queryFn,
      })
    } else {
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: 'success',
          data,
          error: null,
          lastUpdatedAt: Date.now(),
        },
        queryFn,
      })
    }
  }

  async directQuery({ queryKey, queryFn, initialData }) {
    const promiseInFlight = this.promisesInFlight.get(queryKey)
    const entry = this.cache.get(queryKey)

    if (promiseInFlight || entry?.state.status === 'loading') return

    const shouldInitializeWithInitialData =
      !promiseInFlight &&
      initialData !== undefined &&
      entry?.state.data === undefined

    if (shouldInitializeWithInitialData) {
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: 'first-success',
          data: initialData,
          error: null,
          lastUpdatedAt: Date.now(),
        },
        queryFn,
      })
      return
    }

    this.setAndNotifySubscribers({
      queryKey,
      state: {
        status: 'loading',
        data: undefined,
        error: null,
        lastUpdatedAt: Date.now(),
      },
    })

    const promise = queryFn()
    this.promisesInFlight.set(queryKey, promise)

    const [data, error] = await handlePromise({
      promise,
      finallyCb: () => {
        this.promisesInFlight.delete(queryKey)
      },
    })

    if (error) {
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
          data: undefined,
          lastUpdatedAt: FORCE_STALE_TIME,
        },
        queryFn,
      })
    } else {
      const isFirstFetchForQuery = !entry?.state.data

      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: isFirstFetchForQuery ? 'first-success' : 'success',
          data,
          error: null,
          lastUpdatedAt: Date.now(),
        },
        queryFn,
      })
    }
  }

  cancelQuery({ queryKey }) {
    const hasExistingPromise = Boolean(this.promisesInFlight.get(queryKey))
    const entry = this.cache.get(queryKey)
    if (hasExistingPromise && entry) {
      this.promisesInFlight.delete(queryKey)
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          ...entry.state,
          status: 'idle',
          error: null,
          lastUpdatedAt: FORCE_STALE_TIME,
        },
        queryFn: entry.queryFn,
      })
    }
  }

  async invalidateQuery({ queryKey }) {
    const entry = this.cache.get(queryKey)
    if (entry) {
      this.setAndNotifySubscribers({
        queryKey,
        state: {
          status: 'success',
          data: entry.state.data,
          error: null,
          lastUpdatedAt: FORCE_STALE_TIME,
        },
        queryFn: entry.queryFn,
      })

      if (entry.queryFn) {
        await this.backgroundQuery({
          queryKey,
          queryFn: entry.queryFn,
        })
      }
    }
  }

  getSubscriberCount({ queryKey }) {
    return this.subscribers.get(queryKey)?.size || 0
  }

  scheduleGC({ queryKey }) {
    const existingTimeout = this.gcTimeouts.get(queryKey)
    if (existingTimeout) clearTimeout(existingTimeout)

    const timeout = setTimeout(() => {
      this.cache.delete(queryKey)
      this.promisesInFlight.delete(queryKey)
      this.subscribers.delete(queryKey)
      this.gcTimeouts.delete(queryKey)
    }, this.gcTime)

    this.gcTimeouts.set(queryKey, timeout)
  }
}