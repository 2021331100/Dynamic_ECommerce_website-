import { useEffect, useState } from "react";
import { X, LogOut, Upload, Eye, EyeOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {logout,updatePassword,updateProfile,} from "../../store/slices/authSlice";
import { toggleAuthPopup } from "../../store/slices/popupSlice";
