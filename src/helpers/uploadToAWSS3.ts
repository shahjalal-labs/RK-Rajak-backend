/* eslint-disable no-console */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import ffmpegStatic from "ffmpeg-static";

ffmpeg.setFfprobePath(ffprobeStatic.path);
ffmpeg.setFfmpegPath(ffmpegStatic!);
dotenv.config({ path: path.join(process.cwd(), ".env") });


dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});


export const uploadToDigitalOceanAWS = async (file: Express.Multer.File) => {
  try {
    const fileName = file.originalname.replace(/\s+/g, "-");

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);

    const Location = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return { Location };
  } catch (error) {
    console.error("S3 upload failed:", error);
    throw error;
  }
};
