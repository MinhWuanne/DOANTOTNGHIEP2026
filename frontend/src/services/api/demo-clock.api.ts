import { API_BASE_URL } from "./api-config";

export interface DemoClockResult {
  now: string;
}

async function requestDemoClock(
  accessToken: string,
  path: string,
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<DemoClockResult> {
  const response = await fetch(
    `${API_BASE_URL}/admin/demo-clock${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "DEMO_CLOCK_REQUEST_FAILED",
    );
  }

  return result.data;
}

export function getDemoClock(
  accessToken: string,
): Promise<DemoClockResult> {
  return requestDemoClock(
    accessToken,
    "",
    "GET",
  );
}

export function advanceDemoClock(
  accessToken: string,
  hours: number,
): Promise<DemoClockResult> {
  return requestDemoClock(
    accessToken,
    "/advance",
    "POST",
    { hours },
  );
}

export function setDemoClock(
  accessToken: string,
  dateTime: string,
): Promise<DemoClockResult> {
  return requestDemoClock(
    accessToken,
    "/set",
    "POST",
    { dateTime },
  );
}

export function resetDemoClock(
  accessToken: string,
): Promise<DemoClockResult> {
  return requestDemoClock(
    accessToken,
    "/reset",
    "POST",
  );
}
