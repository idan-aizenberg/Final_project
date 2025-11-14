"use client";

import * as React from "react";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast, actionTypes, dispatch } from "@/components/ui/use-toast";

export type ToastActionElement = React.ReactNode;

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex flex-1 flex-col gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action && <ToastAction altText="Dismiss">{action}</ToastAction>}
            <ToastClose onClick={() => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id })} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
