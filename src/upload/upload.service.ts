import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import toStream = require('buffer-to-stream');

@Injectable()
export class UploadService {
  async uploadImage(file: Express.Multer.File, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            return reject(new InternalServerErrorException('Cloudinary upload failed'));
          }
          resolve(result);
        }
      );

      toStream(file.buffer).pipe(stream);
    });
  }

  async uploadBase64Image(base64: string, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64,
        { folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(new InternalServerErrorException('Cloudinary base64 upload failed'));
          }
          resolve(result);
        }
      );
    });
  }
    

  async deleteImage(publicId: string): Promise<void> {
    await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
        if (error || result.result !== 'ok') {
          return reject(
            new InternalServerErrorException('Failed to delete image from Cloudinary')
          );
        }
        resolve(true);
      });
    });
  }

}
