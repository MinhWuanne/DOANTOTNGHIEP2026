import {
    mkdir,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

const PRIVATE_ATTACHMENT_DIRECTORY = path.resolve(
    process.cwd(),
    "private-uploads",
    "complaints",
);

const MIME_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
} as const;

export type ComplaintAttachmentMimeType =
    keyof typeof MIME_EXTENSIONS;

export interface StoreComplaintAttachmentInput {
    originalName: string;
    mimeType: string;
    buffer: Buffer;
}

export interface StoredComplaintAttachment {
    originalName: string;
    storageKey: string;
    mimeType: ComplaintAttachmentMimeType;
    sizeBytes: number;
}

function sanitizeOriginalName(originalName: string): string {
    const baseName = path.win32.basename(
        path.posix.basename(originalName),
    );

    const sanitized = baseName
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim()
        .replace(/[. ]+$/g, "");

    if (!sanitized || sanitized === "." || sanitized === "..") {
        throw new Error("COMPLAINT_ATTACHMENT_INVALID_NAME");
    }

    return Array.from(sanitized)
        .slice(0, 255)
        .join("");
}

function detectMimeType(
    buffer: Buffer,
): ComplaintAttachmentMimeType | null {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A,
            ]),
        )
    ) {
        return "image/png";
    }

    // JPEG signature
    if (
        buffer.length >= 3 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF
    ) {
        return "image/jpeg";
    }

    // WebP: RIFF....WEBP
    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "image/webp";
    }

    return null;
}

function getStoragePath(storageKey: string): string {
    if (!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(storageKey)) {
        throw new Error("COMPLAINT_ATTACHMENT_INVALID_STORAGE_KEY");
    }

    return path.join(
        PRIVATE_ATTACHMENT_DIRECTORY,
        storageKey,
    );
}

export class ComplaintAttachmentService {
    async store(
        input: StoreComplaintAttachmentInput,
    ): Promise<StoredComplaintAttachment> {
        if (
            !Buffer.isBuffer(input.buffer) ||
            input.buffer.length === 0
        ) {
            throw new Error("COMPLAINT_ATTACHMENT_EMPTY_FILE");
        }

        if (input.buffer.length > MAX_ATTACHMENT_SIZE) {
            throw new Error("COMPLAINT_ATTACHMENT_TOO_LARGE");
        }

        const detectedMimeType = detectMimeType(input.buffer);

        if (
            !detectedMimeType ||
            !Object.prototype.hasOwnProperty.call(
                MIME_EXTENSIONS,
                input.mimeType,
            ) ||
            detectedMimeType !== input.mimeType
        ) {
            throw new Error("COMPLAINT_ATTACHMENT_INVALID_TYPE");
        }

        const originalName = sanitizeOriginalName(
            input.originalName,
        );

        const extension = MIME_EXTENSIONS[detectedMimeType];
        const storageKey =
            `${randomBytes(32).toString("hex")}.${extension}`;

        const filePath = getStoragePath(storageKey);

        await mkdir(PRIVATE_ATTACHMENT_DIRECTORY, {
            recursive: true,
        });

        // "wx" prevents accidentally overwriting an existing file.
        await writeFile(filePath, input.buffer, {
            flag: "wx",
            mode: 0o600,
        });

        return {
            originalName,
            storageKey,
            mimeType: detectedMimeType,
            sizeBytes: input.buffer.length,
        };
    }

    async read(storageKey: string): Promise<Buffer> {
        return readFile(getStoragePath(storageKey));
    }

    async remove(storageKey: string): Promise<void> {
        await rm(getStoragePath(storageKey), {
            force: true,
        });
    }
}

export const complaintAttachmentService =
    new ComplaintAttachmentService();
