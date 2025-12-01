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


  
};

export default ProductDetail;
