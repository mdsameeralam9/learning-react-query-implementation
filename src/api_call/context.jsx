import { createContext, useContext } from 'react'
import { QueryClient } from './query-client'

const QueryClientContext = createContext(undefined)

function QueryClientProvider({ client, children }) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  )
}

function useQueryClient() {
  const client = useContext(QueryClientContext)
  if (!client) {
    throw new Error('No QueryClient set, use QueryClientProvider to set one')
  }
  return client
}

export { QueryClientProvider, useQueryClient }