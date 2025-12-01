import {
  X,
  Home,
  Package,
  Info,
  HelpCircle,
  ShoppingCart,
  List,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../store/slices/popupSlice";


const Sidebar = () => {
  const {authUser} = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const menuItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Products", icon: Package, path: "/products" },
    { name: "About", icon: Info, path: "/about" },
    { name: "FAQ", icon: HelpCircle, path: "/faq" },
    { name: "Contact", icon: Phone, path: "/contact" },
    { name: "Cart", icon: ShoppingCart, path: "/cart" },
    authUser && { name: "My Orders", icon: List, path: "/orders" },
  ];

  const { isSidebarOpen } = useSelector(state => state.popup);
  if (!isSidebarOpen) return null;

  return(<>
    {/* OVERLAY */}
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      onClick={() => dispatch(toggleSidebar())}
    />


  </>
  );
};

export default Sidebar;
