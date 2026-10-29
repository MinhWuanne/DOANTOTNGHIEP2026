
import { prisma } from "../../lib/prisma.js";

export class DemoClockService {

  private async ensureState(): Promise<void> {
    const existing = await prisma.demoClockState.findUnique({
      where: {
        id: 1,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return;
    }

    const now = new Date();

    try {
      await prisma.demoClockState.create({
        data: {
          id: 1,
          simulatedAt: now,
          realTimeAt: now,
        },
      });
    } catch (error: unknown) {
      const isUniqueConstraintError =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002";

      if (!isUniqueConstraintError) {
        throw error;
      }

      // Another concurrent caller may have created the initial row.
      const createdByAnotherCall =
        await prisma.demoClockState.findUnique({
          where: {
            id: 1,
          },
          select: {
            id: true,
          },
        });

      if (!createdByAnotherCall) {
        throw error;
      }
    }
  }


  async getNow(): Promise<Date> {
    await this.ensureState();

    const state = await prisma.demoClockState.findUnique({
      where: {
        id: 1,
      },
      select: {
        simulatedAt: true,
        realTimeAt: true,
      },
    });

    if (!state) {
      throw new Error("DEMO_CLOCK_STATE_NOT_FOUND");
    }

    const elapsedMilliseconds =
      Date.now() - state.realTimeAt.getTime();

    return new Date(
      state.simulatedAt.getTime() + elapsedMilliseconds,
    );
  }

  async advanceHours(hours: number): Promise<Date> {
    if (!Number.isFinite(hours) || hours < 0) {
      throw new Error("INVALID_HOURS");
    }

    await this.ensureState();

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          simulatedAt: Date;
          realTimeAt: Date;
        }>
      >`
        SELECT simulatedAt, realTimeAt
        FROM demo_clock_state
        WHERE id = 1
        FOR UPDATE
      `;

      const state = rows[0];

      if (!state) {
        throw new Error("DEMO_CLOCK_STATE_NOT_FOUND");
      }

      const realNow = new Date();

      const currentSimulatedTime =
        state.simulatedAt.getTime() +
        (realNow.getTime() - state.realTimeAt.getTime());

      const simulatedAt = new Date(
        currentSimulatedTime +
        hours * 60 * 60 * 1000,
      );

      await tx.demoClockState.update({
        where: {
          id: 1,
        },
        data: {
          simulatedAt,
          realTimeAt: realNow,
        },
      });

      return simulatedAt;
    });
  }


  async setTime(value: Date): Promise<Date> {
    if (
      !(value instanceof Date) ||
      Number.isNaN(value.getTime())
    ) {
      throw new Error("INVALID_DEMO_TIME");
    }

    await this.ensureState();

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: number;
        }>
      >`
        SELECT id
        FROM demo_clock_state
        WHERE id = 1
        FOR UPDATE
      `;

      if (!rows[0]) {
        throw new Error("DEMO_CLOCK_STATE_NOT_FOUND");
      }

      const realNow = new Date();

      await tx.demoClockState.update({
        where: {
          id: 1,
        },
        data: {
          simulatedAt: value,
          realTimeAt: realNow,
        },
      });

      return value;
    });
  }

  async reset(): Promise<Date> {
    await this.ensureState();

    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: number;
        }>
      >`
        SELECT id
        FROM demo_clock_state
        WHERE id = 1
        FOR UPDATE
      `;

      if (!rows[0]) {
        throw new Error("DEMO_CLOCK_STATE_NOT_FOUND");
      }

      const realNow = new Date();

      await tx.demoClockState.update({
        where: {
          id: 1,
        },
        data: {
          simulatedAt: realNow,
          realTimeAt: realNow,
        },
      });

      return realNow;
    });
  }
}

export const demoClockService =
  new DemoClockService();
