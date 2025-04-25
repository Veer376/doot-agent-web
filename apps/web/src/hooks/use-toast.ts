"use client";

import { toast as sonnerToast } from "sonner";

type ToastOptions = Parameters<typeof sonnerToast>[1];

export type ToastProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  [key: string]: any;
};

export function toast(props: ToastProps | string, options?: ToastOptions) {
  if (typeof props === "string") {
    return sonnerToast(props, options);
  }

  const { title, description, ...rest } = props;

  if (title && description) {
    return sonnerToast(title as string, {
      description,
      ...options,
      ...rest,
    });
  }

  return sonnerToast(title as string, {
    ...options,
    ...rest,
  });
}

export function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    error: sonnerToast.error,
    success: sonnerToast.success,
    warning: sonnerToast.warning,
    info: sonnerToast.info,
    promise: sonnerToast.promise,
    custom: sonnerToast.custom,
    loading: sonnerToast.loading,
  };
}
