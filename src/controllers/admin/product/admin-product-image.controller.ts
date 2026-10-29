
import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";

import { adminProductImageService } from "../../../services/admin/product/admin-product-image.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "products",
);

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getImageExtension(
  mimetype: string,
  buffer: Buffer,
) {
  if (
    mimetype === "image/jpeg" &&
    buffer.subarray(0, 3).equals(
      Buffer.from([0xff, 0xd8, 0xff]),
    )
  ) {
    return ".jpg";
  }

  if (
    mimetype === "image/png" &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ]),
    )
  ) {
    return ".png";
  }

  if (
    mimetype === "image/webp" &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return ".webp";
  }

  return null;
}

export class AdminProductImageController {
  async getImages(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const productId = parseAdminId(request.params.id);

      const images =
        await adminProductImageService.getImages(
          productId,
        );

      return reply.send({
        success: true,
        data: images,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }

  async uploadImage(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    let savedFilePath: string | undefined;

    try {
      const productId = parseAdminId(request.params.id);
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: "IMAGE_REQUIRED",
        });
      }

      if (!allowedMimeTypes.has(file.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: "INVALID_IMAGE_TYPE",
        });
      }

      const buffer = await file.toBuffer();
      const extension = getImageExtension(
        file.mimetype,
        buffer,
      );

      if (!extension) {
        return reply.status(400).send({
          success: false,
          error: "INVALID_IMAGE_CONTENT",
        });
      }

      await mkdir(uploadDirectory, {
        recursive: true,
      });

      const filename = `${randomUUID()}${extension}`;

      savedFilePath = path.join(
        uploadDirectory,
        filename,
      );

      const { writeFile } = await import(
        "node:fs/promises"
      );

      await writeFile(savedFilePath, buffer, {
        flag: "wx",
      });

      const image =
        await adminProductImageService.createImage(
          productId,
          `/uploads/products/${filename}`,
        );

      return reply.status(201).send({
        success: true,
        data: image,
      });
    } catch (error) {
      if (savedFilePath) {
        await unlink(savedFilePath).catch(() => {});
      }

      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }

  async setPrimaryImage(
    request: FastifyRequest<{
      Params: {
        id: string;
        imageId: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const productId = parseAdminId(request.params.id);
      const imageId = parseAdminId(request.params.imageId);

      const image =
        await adminProductImageService.setPrimaryImage(
          productId,
          imageId,
        );

      return reply.send({
        success: true,
        data: image,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_IMAGE_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_IMAGE_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }

  async deleteImage(
    request: FastifyRequest<{
      Params: {
        id: string;
        imageId: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const productId = parseAdminId(request.params.id);
      const imageId = parseAdminId(request.params.imageId);

      const images =
        await adminProductImageService.getImages(
          productId,
        );

      const image = images.find(
        (item) => item.id === imageId,
      );

      if (!image) {
        return reply.status(404).send({
          success: false,
          error: "PRODUCT_IMAGE_NOT_FOUND",
        });
      }

      await adminProductImageService.deleteImage(
        productId,
        imageId,
      );

      const filename = path.basename(image.url);

      await unlink(
        path.join(uploadDirectory, filename),
      ).catch(() => {});

      return reply.send({
        success: true,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }
}

export const adminProductImageController =
  new AdminProductImageController();
