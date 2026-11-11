"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const emptySubscribe = () => () => undefined;

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const theme: ToasterProps["theme"] = !mounted ? "dark" : resolvedTheme === "light" ? "light" : "dark";

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-border !bg-card !text-card-foreground !shadow-xl",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
