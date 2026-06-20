import { create } from "zustand";
import type { Email, Supplier, Attachment } from "@/types";
import { MOCK_EMAILS, MOCK_SUPPLIERS } from "@/data/mockData";
import { parseEmail } from "@/services/emailParser";

interface EmailState {
  emails: Email[];
  suppliers: Supplier[];
  currentEmail: Email | null;
  isLoading: boolean;

  importEmail: (
    rawContent: string,
    overrideSender?: string,
    overrideSubject?: string,
    overrideSupplier?: Supplier
  ) => Email;
  getEmailById: (id: string) => Email | undefined;
  setCurrentEmail: (email: Email | null) => void;
  getEmailsBySupplier: (supplierId: string) => Email[];
  addAttachment: (emailId: string, attachment: Attachment) => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: MOCK_EMAILS,
  suppliers: MOCK_SUPPLIERS,
  currentEmail: null,
  isLoading: false,

  importEmail: (rawContent, overrideSender, overrideSubject, overrideSupplier) => {
    const email = parseEmail(rawContent, overrideSender, overrideSubject, overrideSupplier);
    set((state) => ({
      emails: [email, ...state.emails],
      currentEmail: email,
    }));
    return email;
  },

  getEmailById: (id) => get().emails.find((e) => e.id === id),

  setCurrentEmail: (email) => set({ currentEmail: email }),

  getEmailsBySupplier: (supplierId) =>
    get().emails.filter((e) => e.supplierId === supplierId),

  addAttachment: (emailId, attachment) =>
    set((state) => ({
      emails: state.emails.map((e) =>
        e.id === emailId
          ? { ...e, attachments: [...e.attachments, attachment] }
          : e
      ),
    })),
}));
