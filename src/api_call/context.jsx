import { createContext, useContext } from 'react'

const QueryClientContext = createContext();

const QueryClientProvider = ({ client, children }) => {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  )
}

const useQueryClient = () => {
  const client = useContext(QueryClientContext)
  if (!client) {
    throw new Error('No QueryClient set, use QueryClientProvider to set one')
  }
  return client
}

export { QueryClientProvider, useQueryClient }