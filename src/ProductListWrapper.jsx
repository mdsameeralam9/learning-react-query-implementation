/* eslint-disable no-useless-catch */
import { useQuery } from "./api_call/use-query";

const makeAPICall = async () => {
  try {
    const response = await fetch("https://dummyjson.com/products");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const result = await response.json();

    if (Array.isArray(result?.products) && result?.products?.length > 0) {
      const formatResponse = result?.products?.map(({ id, title, images }) => ({
        id,
        title,
        image: images?.[0],
      }));
      return formatResponse;
    }
  } catch (err) {
    throw err;
  }
};

const ProductListWrapper = () => {
  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: makeAPICall,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    retry: 2, // Retry failed requests up to 2 times
  });

  

  return (
    <div className="productList" style={{display: "flex", gap: "1rem", flexWrap: "wrap"}}>
      {data?.map(({ image, title, price }) => (
        <div className="card" style={{width: "140px", height: "200px", border: "1px solid"}}>
          <img src={image} alt={title} className="card-image" width={"100%"} height={"70%"}/>
          <div className="card-content">
            <h3 className="card-title">{title}</h3>
            <p className="card-price">₹{price}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductListWrapper;
