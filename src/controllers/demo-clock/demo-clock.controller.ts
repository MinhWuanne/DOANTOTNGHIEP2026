import { demoClockService } from "../../services/demo-clock/demo-clock.service.js";

export class DemoClockController {
  async getNow() {
    return {
      now: await demoClockService.getNow(),
    };
  }

  async advanceHours(hours: number) {
    return {
      now: await demoClockService.advanceHours(hours),
    };
  }

  async reset() {
    return {
      now: await demoClockService.reset(),
    };
  }

  async setTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error("INVALID_DEMO_TIME");
    }

    return {
      now: await demoClockService.setTime(date),
    };
  }
}
export const demoClockController = new DemoClockController();
