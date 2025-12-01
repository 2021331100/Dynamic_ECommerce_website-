import { useEffect, useState } from "react";
import { X, LogOut, Upload, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {logout,updatePassword,updateProfile,} from "../../store/slices/authSlice";
import { toggleAuthPopup } from "../../store/slices/popupSlice";


const ProfilePanel = () => {
  const dispatch = useDispatch();
  const { isAuthPopupOpen } = useSelector((state) => state.popup);
  const { authUser, isUpdatingProfile, isUpdatingPassword } = useSelector(
    (state) => state.auth
  );

  const [name, setName] = useState(authUser?.name || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [avatar, setAvatar] = useState(null);
  useEffect(() => {
    if (authUser) {
      setName(authUser.name || "");
      setEmail(authUser.email || "");
    }
  }, [authUser]);
    const[showPassword,setShowPassword]=useState("");
  const[currentPassword,setCurrentPassword]=useState("");
  const[newPassword,setNewPassword]=useState("");
  const[confirmNewPassword,setConfirmNewPassword]=useState("");
  
  const handleLogout= ()=>{
    dispatch(logout());
  };

  const handleUpdateProfile = () => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  if (avatar) formData.append("avatar", avatar);
  dispatch(updateProfile(formData));
  };

  const handleUpdatePassword = () => {
    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmNewPassword", confirmNewPassword);
    dispatch(updatePassword(formData));
  };
  if(!isAuthPopupOpen || !authUser) return null;
  
  
};
export default ProfilePanel;
