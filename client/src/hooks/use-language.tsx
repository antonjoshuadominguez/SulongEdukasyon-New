import { ReactNode } from "react";
import { translations } from "@/lib/translations";

// Simple translate function that always returns Tagalog text
export function translate(key: string): string {
  return translations[key] || key;
}

// Simple no-op Language Provider that just renders children
export function LanguageProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// Mock hook that returns fixed Tagalog-only methods
export function useLanguage() {
  return {
    language: "tl",
    toggleLanguage: () => {},
    translate: (key: string) => translations[key] || key
  };
}

// Function for direct translation - always returns Tagalog
export function t(key: string, vars?: Record<string, any>): string {
  let translation = translations[key] || key;
  
  if (vars) {
    Object.entries(vars).forEach(([varName, value]) => {
      translation = translation.replace(new RegExp(`{{${varName}}}`, 'g'), String(value));
    });
  }
  
  return translation;
}