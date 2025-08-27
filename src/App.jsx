import { QueryClient, QueryClientProvider } from "./api_call/index";
import ProductListWrapper from "./ProductListWrapper";

function App() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ProductListWrapper />
    </QueryClientProvider>
  );
}

export default App;
