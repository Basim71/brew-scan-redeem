import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LiveStatusState = "live" | "updating" | "offline" | "error";

type LiveStatusContextValue = {
  state: LiveStatusState;
  updatedAt: Date | null;
  message?: string;
  markUpdating: (message?: string) => void;
  markUpdated: (updatedAt?: Date) => void;
  markError: (message?: string) => void;
  retry: () => void;
};

const LiveStatusContext = createContext<LiveStatusContextValue | null>(null);

export function LiveStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveStatusState>("live");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    setUpdatedAt(new Date());

    const syncConnectionState = () => {
      if (navigator.onLine) {
        setState((current) => (current === "offline" ? "live" : current));
        setMessage((current) => (current === "offline" ? undefined : current));
        setUpdatedAt(new Date());
      } else {
        setState("offline");
        setMessage("offline");
      }
    };

    syncConnectionState();
    window.addEventListener("online", syncConnectionState);
    window.addEventListener("offline", syncConnectionState);
    return () => {
      window.removeEventListener("online", syncConnectionState);
      window.removeEventListener("offline", syncConnectionState);
    };
  }, []);

  const markUpdating = useCallback((nextMessage?: string) => {
    setState("updating");
    setMessage(nextMessage);
  }, []);

  const markUpdated = useCallback((nextUpdatedAt = new Date()) => {
    setState(navigator.onLine ? "live" : "offline");
    setUpdatedAt(nextUpdatedAt);
    setMessage(undefined);
  }, []);

  const markError = useCallback((nextMessage?: string) => {
    setState("error");
    setMessage(nextMessage);
  }, []);

  const retry = useCallback(() => {
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    setState("updating");
    setMessage(undefined);
    window.setTimeout(() => {
      setState("live");
      setUpdatedAt(new Date());
    }, 650);
  }, []);

  const value = useMemo<LiveStatusContextValue>(
    () => ({ state, updatedAt, message, markUpdating, markUpdated, markError, retry }),
    [state, updatedAt, message, markUpdating, markUpdated, markError, retry],
  );

  return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>;
}

export function useLiveStatus() {
  const value = useContext(LiveStatusContext);
  if (!value) {
    throw new Error("useLiveStatus must be used inside LiveStatusProvider");
  }
  return value;
}
