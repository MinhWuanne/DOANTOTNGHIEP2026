import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getAccessToken } from "../utils/auth";

import {
  advanceDemoClock,
  getDemoClock,
  resetDemoClock,
  setDemoClock,
} from "../services/api/demo-clock.api";

interface DemoClockContextValue {
  demoTime: Date;
  setDemoTime: (value: Date) => void;
  addHours: (hours: number) => void;
  resetToRealTime: () => void;
}

const DemoClockContext =
  createContext<DemoClockContextValue | null>(null);

interface DemoClockProviderProps {
  children: ReactNode;
}

function DemoClockProvider({
  children,
}: DemoClockProviderProps) {
  const [demoTime, setDemoTimeState] = useState<Date>(
    () => new Date(),
  );

  const lastTickRef = useRef(Date.now());
  const initializedRef = useRef(false);
  const requestQueueRef = useRef<Promise<void>>(
    Promise.resolve(),
  );

  const enqueueRequest = useCallback(
    (request: () => Promise<void>) => {
      requestQueueRef.current = requestQueueRef.current
        .catch(() => undefined)
        .then(request);
    },
    [],
  );

  const applyServerTime = useCallback((value: string) => {
    const next = new Date(value);

    if (Number.isNaN(next.getTime())) {
      throw new Error("INVALID_DEMO_CLOCK_RESPONSE");
    }

    lastTickRef.current = Date.now();
    setDemoTimeState(next);
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeDemoClock() {
      const accessToken = getAccessToken("ADMIN");

      if (!accessToken) {
        return;
      }

      try {
        const result = await getDemoClock(accessToken);

        if (!cancelled) {
          applyServerTime(result.now);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to initialize Demo Clock:",
            error,
          );
        }
      }
    }

    void initializeDemoClock();

    return () => {
      cancelled = true;
    };
  }, [applyServerTime]);

  // Tự động cho đồng hồ demo tiến lên theo thời gian thực.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!initializedRef.current) {
        return;
      }

      const now = Date.now();
      const elapsed = now - lastTickRef.current;

      if (elapsed < 1000) {
        return;
      }

      lastTickRef.current = now;

      setDemoTimeState((current) => {
        return new Date(current.getTime() + elapsed);
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const setDemoTime = useCallback(
    (value: Date) => {
      if (Number.isNaN(value.getTime())) {
        return;
      }

      const accessToken = getAccessToken("ADMIN");

      if (!accessToken) {
        console.error("Demo Clock requires admin authentication.");
        return;
      }

      const dateTime = value.toISOString();

      enqueueRequest(async () => {
        const result = await setDemoClock(
          accessToken,
          dateTime,
        );

        applyServerTime(result.now);
      });
    },
    [applyServerTime, enqueueRequest],
  );

  const addHours = useCallback(
    (hours: number) => {
      if (!Number.isFinite(hours) || hours === 0) {
        return;
      }

      const accessToken = getAccessToken("ADMIN");

      if (!accessToken) {
        console.error("Demo Clock requires admin authentication.");
        return;
      }

      enqueueRequest(async () => {
        const result = await advanceDemoClock(
          accessToken,
          hours,
        );

        applyServerTime(result.now);
      });
    },
    [applyServerTime, enqueueRequest],
  );

  const resetToRealTime = useCallback(() => {
    const accessToken = getAccessToken("ADMIN");

    if (!accessToken) {
      console.error("Demo Clock requires admin authentication.");
      return;
    }

    enqueueRequest(async () => {
      const result = await resetDemoClock(accessToken);

      applyServerTime(result.now);
    });
  }, [applyServerTime, enqueueRequest]);

  const value = useMemo(
    () => ({
      demoTime,
      setDemoTime,
      addHours,
      resetToRealTime,
    }),
    [
      demoTime,
      setDemoTime,
      addHours,
      resetToRealTime,
    ],
  );

  return (
    <DemoClockContext.Provider value={value}>
      {children}
    </DemoClockContext.Provider>
  );
}

export function useDemoClock() {
  const context = useContext(DemoClockContext);

  if (!context) {
    throw new Error(
      "useDemoClock must be used inside DemoClockProvider",
    );
  }

  return context;
}

export default DemoClockProvider;