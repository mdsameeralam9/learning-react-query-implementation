import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from './context'
import { hashKey } from './utils'

export function useQuery(options) {
  const queryClient = useQueryClient()
  const isInitialFetchRef = useRef(true)
  const { queryKey, queryFn, isEnabled = true } = options

  const initialStateRef = useRef({
    status: 'idle',
    data: undefined,
    error: null,
    lastUpdatedAt: Date.now(),
  })

  const getSnapshot = useCallback(() => {
    return queryClient.getQueryState(queryKey) ?? initialStateRef.current
  }, [queryClient, queryKey])

  const state = useSyncExternalStore(
    useCallback(
      (onStoreChange) => {
        const hashedKey = hashKey(queryKey)
        return queryClient.subscribe(hashedKey, onStoreChange)
      },
      [queryClient, queryKey]
    ),
    getSnapshot
  )

  useEffect(() => {
    if (isEnabled && queryFn && isInitialFetchRef.current) {
      void queryClient.fetchQuery({
        queryKey,
        queryFn,
        initialData: options.initialData,
      })

      isInitialFetchRef.current = false
    }
  }, [isEnabled, queryClient, queryFn, queryKey, options.initialData])

  const refetch = useCallback(() => {
    if (!queryFn) return
    void queryClient.refetchQueries(queryKey)
  }, [queryClient, queryFn, queryKey])

  switch (state.status) {
    case 'idle':
      return {
        status: 'idle',
        data: undefined,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: false,
        refetch,
      }
    case 'loading':
      return {
        status: 'loading',
        data: undefined,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
        refetch,
      }
    case 'fetching':
      return {
        status: 'fetching',
        data: state.data,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: false,
        refetch,
      }
    case 'error':
      return {
        status: 'error',
        data: undefined,
        error: state.error,
        isLoading: false,
        isError: true,
        isSuccess: false,
        refetch,
      }
    case 'success':
    case 'first-success':
      return {
        status: 'success',
        data: state.data,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
        refetch,
      }
  }
}