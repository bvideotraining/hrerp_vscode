import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import ffmpegStatic = require('ffmpeg-static');
import ffmpeg = require('fluent-ffmpeg');

export type CompressionLevel = 'high' | 'balanced' | 'compressed';

export interface CompressionResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
}

// Quality settings per compression level
const IMAGE_QUALITY: Record<CompressionLevel, number> = {
  high: 85,
  balanced: 75,
  compressed: 60,
};

const VIDEO_CRF: Record<CompressionLevel, number> = {
  high: 20,
  balanced: 23,
  compressed: 28,
};

const AUDIO_BITRATE: Record<CompressionLevel, string> = {
  high: '192k',
  balanced: '128k',
  compressed: '96k',
};

@Injectable()
export class PixabayCompressionService {
  private readonly logger = new Logger(PixabayCompressionService.name);

  constructor(private readonly configService: ConfigService) {
    // Point fluent-ffmpeg to the bundled static binary
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
    }
  }

  // ── Images ───────────────────────────────────────────────────────────

  async compressImage(
    buffer: Buffer,
    level: CompressionLevel = 'balanced',
  ): Promise<CompressionResult> {
    const originalSize = buffer.length;
    const maxSizeMb = Number(this.configService.get<string>('MAX_FILE_COMPRESS_SIZE_MB', '10'));
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    // Only compress if buffer exceeds the configured threshold
    if (originalSize <= maxSizeBytes && level === 'high') {
      return {
        buffer,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        originalSize,
        compressedSize: originalSize,
        compressed: false,
      };
    }

    const quality = IMAGE_QUALITY[level];
    const maxWidth = level === 'compressed' ? 1920 : 2560;

    try {
      const compressedBuffer = await sharp(buffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      this.logger.log(
        `Image compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB (${level})`,
      );

      return {
        buffer: compressedBuffer,
        mimeType: 'image/webp',
        extension: 'webp',
        originalSize,
        compressedSize: compressedBuffer.length,
        compressed: true,
      };
    } catch (err: any) {
      this.logger.error(`Image compression failed: ${err?.message || err}`);
      // Return original on failure — do not block upload
      return {
        buffer,
        mimeType: 'image/jpeg',
        extension: 'jpg',
        originalSize,
        compressedSize: originalSize,
        compressed: false,
      };
    }
  }

  // ── Videos ───────────────────────────────────────────────────────────

  async compressVideo(
    buffer: Buffer,
    level: CompressionLevel = 'balanced',
  ): Promise<CompressionResult> {
    const originalSize = buffer.length;
    const maxSizeMb = Number(this.configService.get<string>('MAX_FILE_COMPRESS_SIZE_MB', '10'));
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (originalSize <= maxSizeBytes && level === 'high') {
      return { buffer, mimeType: 'video/mp4', extension: 'mp4', originalSize, compressedSize: originalSize, compressed: false };
    }

    const crf = VIDEO_CRF[level];
    // Reduce resolution based on file size
    const maxHeight = originalSize > 50 * 1024 * 1024 ? 720 : originalSize > 20 * 1024 * 1024 ? 1080 : 1440;

    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `pixabay_in_${Date.now()}.mp4`);
    const outputPath = path.join(tmpDir, `pixabay_out_${Date.now()}.mp4`);

    try {
      fs.writeFileSync(inputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .audioBitrate(AUDIO_BITRATE[level])
          .addOutputOption(`-crf ${crf}`)
          .addOutputOption('-preset fast')
          .addOutputOption('-movflags +faststart')
          .size(`?x${maxHeight}`)
          .outputFormat('mp4')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: any) => reject(err))
          .run();
      });

      const compressedBuffer = fs.readFileSync(outputPath);
      this.logger.log(
        `Video compressed: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedBuffer.length / 1024 / 1024).toFixed(1)}MB (${level})`,
      );

      return {
        buffer: compressedBuffer,
        mimeType: 'video/mp4',
        extension: 'mp4',
        originalSize,
        compressedSize: compressedBuffer.length,
        compressed: true,
      };
    } catch (err: any) {
      this.logger.error(`Video compression failed: ${err?.message || err}`);
      return { buffer, mimeType: 'video/mp4', extension: 'mp4', originalSize, compressedSize: originalSize, compressed: false };
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }

  // ── Audio / Music ────────────────────────────────────────────────────

  async compressAudio(
    buffer: Buffer,
    level: CompressionLevel = 'balanced',
  ): Promise<CompressionResult> {
    const originalSize = buffer.length;
    const thresholdBytes = 5 * 1024 * 1024; // 5MB

    if (originalSize <= thresholdBytes && level === 'high') {
      return { buffer, mimeType: 'audio/mpeg', extension: 'mp3', originalSize, compressedSize: originalSize, compressed: false };
    }

    const bitrate = AUDIO_BITRATE[level];
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `pixabay_audio_in_${Date.now()}`);
    const outputPath = path.join(tmpDir, `pixabay_audio_out_${Date.now()}.mp3`);

    try {
      fs.writeFileSync(inputPath, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libmp3lame')
          .audioBitrate(bitrate)
          .outputFormat('mp3')
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: any) => reject(err))
          .run();
      });

      const compressedBuffer = fs.readFileSync(outputPath);
      this.logger.log(
        `Audio compressed: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedBuffer.length / 1024).toFixed(1)}KB (${level})`,
      );

      return {
        buffer: compressedBuffer,
        mimeType: 'audio/mpeg',
        extension: 'mp3',
        originalSize,
        compressedSize: compressedBuffer.length,
        compressed: true,
      };
    } catch (err: any) {
      this.logger.error(`Audio compression failed: ${err?.message || err}`);
      return { buffer, mimeType: 'audio/mpeg', extension: 'mp3', originalSize, compressedSize: originalSize, compressed: false };
    } finally {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
  }

  // ── Detect media type from URL ────────────────────────────────────────

  detectMimeType(url: string): string {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
      mp3: 'audio/mpeg', aac: 'audio/aac', ogg: 'audio/ogg', wav: 'audio/wav',
    };
    return map[ext] || 'application/octet-stream';
  }
}
