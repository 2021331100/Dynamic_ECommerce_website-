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
  
};

export default ProductDetail;
