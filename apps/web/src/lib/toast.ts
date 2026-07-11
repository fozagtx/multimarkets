import { toast as pushToast, type ToastInput, type ToastTone } from "@/components/toast/toast-context";

export type { ToastInput, ToastTone };

export function toast(input: ToastInput | string) {
  return pushToast(input);
}

export function toastSuccess(title: string, description?: string) {
  return pushToast({ title, description, tone: "success" });
}

export function toastError(title: string, description?: string) {
  return pushToast({ title, description, tone: "danger", duration: 5200 });
}

export function toastWarning(title: string, description?: string) {
  return pushToast({ title, description, tone: "warning" });
}

export function toastInfo(title: string, description?: string) {
  return pushToast({ title, description, tone: "primary" });
}
