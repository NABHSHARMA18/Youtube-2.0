import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider, useUser } from "../lib/AuthContext";
import "../styles/videoCall.css";

type AppContentProps = Pick<
  AppProps,
  "Component" | "pageProps"
>;

function AppContent({
  Component,
  pageProps,
}: AppContentProps) {
  const { theme, toggleTheme } = useUser();

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      <Toaster />

      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-5 bottom-5 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-xl shadow-lg transition-all duration-200 hover:scale-105"
        title={
          theme === "dark"
            ? "Switch to Light Mode"
            : "Switch to Dark Mode"
        }
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <div className="flex">
        <Sidebar />

        <Component {...pageProps} />
      </div>
    </div>
  );
}

export default function App({
  Component,
  pageProps,
}: AppProps) {
  return (
    <UserProvider>
      <AppContent
        Component={Component}
        pageProps={pageProps}
      />
    </UserProvider>
  );
}