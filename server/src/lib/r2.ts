import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env["R2_ACCOUNT_ID"]!;
const R2_ACCESS_KEY_ID = process.env["R2_ACCESS_KEY_ID"]!;
const R2_SECRET_ACCESS_KEY = process.env["R2_SECRET_ACCESS_KEY"]!;
const R2_BUCKET_NAME = process.env["R2_BUCKET_NAME"]!;

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadPdf(key: string, buffer: Buffer): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    })
  );
}

export async function deletePdf(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export async function pdfExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 900
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn }
  );
}
