import { QueryCache } from './query-cache'
import { hashKey } from './utils'

export class QueryClient {
  constructor(config) {
    this.queryCache = new QueryCache(config)
  }

  getQueryData(queryKey) {
    const hashedKey = hashKey(queryKey)
    const state = this.queryCache.getState({ queryKey: hashedKey })
    return state?.data
  }

  getQueryState(queryKey) {
    const hashedKey = hashKey(queryKey)
    return this.queryCache.getState({ queryKey: hashedKey })
  }

  setQueryData(queryKey, data) {
    const hashedKey = hashKey(queryKey)
    this.queryCache.setData({ queryKey: hashedKey, data })
  }

  fetchQuery({ queryKey, queryFn, initialData }) {
    const hashedKey = hashKey(queryKey)
    return this.queryCache.fetchQuery({ queryKey: hashedKey, queryFn, initialData })
  }

  subscribe(queryKey, callback) {
    return this.queryCache.subscribe(queryKey, callback)
  }

  invalidateQueries(queryKey) {
    const hashedKey = hashKey(queryKey)
    return this.queryCache.invalidateQuery({ queryKey: hashedKey })
  }

  refetchQueries(queryKey) {
    const hashedKey = hashKey(queryKey)
    return this.queryCache.refetchQuery({ queryKey: hashedKey })
  }

  cancelQueries(queryKey) {
    const hashedKey = hashKey(queryKey)
    this.queryCache.cancelQuery({ queryKey: hashedKey })
  }

  clear() {
    this.queryCache.clear()
  }

  getQueryCache() {
    return this.queryCache
  }
}