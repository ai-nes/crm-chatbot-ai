/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  loginAsync,
  logoutAsync,
  selectAuth,
  selectUser,
  setupAutoRefresh,
} from "@/lib/redux/slices/authSlice";
import { ROLE_ADMIN, ROLE_AGENT } from "@/lib/types/roles";

export function useAuth() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);

  const roles = user?.role ?? [];
  const isAdmin = roles.includes(ROLE_ADMIN);
  const isAgent = roles.includes(ROLE_AGENT);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginAsync(credentials)).unwrap();

      if (result.token) setupAutoRefresh(result.token, dispatch as any);

      toast.success("Đăng nhập thành công");

      if (isAdmin) router.push("/admin/dashboard");
      else router.push("/dashboard");

      return result;
    } catch (error: any) {
      toast.error(error || "Đăng nhập thất bại");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success("Đăng xuất thành công");
      router.push("/login");
    } catch {
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
  };

  return {
    ...auth,
    user,
    isAdmin,
    isAgent,
    login,
    logout,
  };
}
