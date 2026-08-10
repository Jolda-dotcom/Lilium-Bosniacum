import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { MessageModalState, ToastMessage } from "../types/app";

interface UseAppDialogsOptions {
  setToastMessages: Dispatch<SetStateAction<ToastMessage[]>>;
  setMessageModal: Dispatch<SetStateAction<MessageModalState | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function useAppDialogs({ setToastMessages, setMessageModal, setStatusMessage }: UseAppDialogsOptions) {
  const removeToast = useCallback((id: string) => {
    setToastMessages((prev) => prev.filter((t) => t.id !== id));
  }, [setToastMessages]);

  const showToast = useCallback((type: "info" | "success" | "error", title: string, message: string) => {
    setToastMessages((prev) => {
      const exists = prev.some((t) => t.type === type && t.title === title && t.message === message);
      if (exists) return prev;
      const id = Date.now().toString();
      return [...prev, { id, type, title, message }];
    });
  }, [setToastMessages]);

  const showMessage = useCallback((title: string, message: string) => {
    const type = title === "Greška" ? "error" : title === "Info" ? "info" : "success";
    showToast(type, title, message);
  }, [showToast]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void,
    confirmText = "Potvrdi",
    cancelText = "Odustani"
  ) => {
    setMessageModal({ title, message, confirmText, cancelText, onConfirm });
  }, [setMessageModal]);

  const closeMessageModal = useCallback(() => setMessageModal(null), [setMessageModal]);

  return { removeToast, showToast, showMessage, showConfirm, closeMessageModal };
}
