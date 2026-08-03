"use client";

import toast from "react-hot-toast";

/** Thin, styled access to the shared toast host (see components/VtToaster). */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
};
