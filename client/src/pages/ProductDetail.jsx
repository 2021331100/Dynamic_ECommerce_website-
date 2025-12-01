import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Star,
  ShoppingCart,
  Heart,
  Share2,
  Plus,
  Minus,
  Loader,
  CircleDollarSign,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import ReviewsContainer from "../components/Products/ReviewsContainer";
import { addToCart } from "../store/slices/cartSlice";
import { fetchProductDetails } from "../store/slices/productSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../lib/currency";
const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const product=useSelector((state)=>state.product?.productDetails);
  const { loading, productReviews } = useSelector((state) => state.product);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");

  const handleAddToCart = () => {
    dispatch(addToCart({ product, quantity }));
  };

  const handleCopyURL = () => {
    const currentURL = window.location.href;
    navigator.clipboard
      .writeText(currentURL)
      .then(() => {
        toast.success("URL Copied ", currentURL);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
      });
  };
  const navigateTo = useNavigate();
  const handleBuyNow=()=>{
    dispatch(addToCart({product,quantity}));
    navigateTo("/payment")
  }

  useEffect(() => {
    dispatch(fetchProductDetails(id));
  }, [dispatch, id]);
  if (!product) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Product Not Found
          </h1>
          <p className="text-muted-foreground">
            The product you're looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }
  return (<>
    <div className="min-h-screen pt-20">
      <div className="container mx-auto py-4 px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <div className="glass-card p-4 mb-4">
            {product.images ? (
              <img
                src={product.images[selectedImage]?.url}
                alt={product.name}
                className="w-full h-96 object-contain rounded-lg"
              />
            ) : (
              <div className="glass-card min-h-[418px] p-4 mb-4 animate-pulse"/>
            )}
            </div>
            <div className="flex space-x-2">
            {product.images && product?.images.map((image, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-primary"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={image?.url}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}
          </div>
          </div>

          


  </>);
};

export default ProductDetail;
