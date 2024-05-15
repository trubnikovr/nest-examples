import { DataUrlConverter } from '@infrastructure/files/classes/data.url.converter';
import { LinkConverter } from '@infrastructure/files/classes/link.converter';
import { Uint8ArrayConverter } from '@infrastructure/files/classes/uint8.array.converter';
import { FileType } from '@infrastructure/files/interfaces/file.interface';
import { AllowedImageExtensions } from '@interfaces/allowed.extensions';
import type { IImageInterfaceResponse } from '@interfaces/images/get.image.query';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { isEnum, isString } from 'class-validator';
import { existsSync } from 'fs';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { lookup } from 'mime-types';
import { normalize } from 'path';
import * as sharp from 'sharp';
import type { Stream } from 'typeorm';

import { IMAGE_ROUTER } from '@routers/frontend';
import type { ConverterAbstract } from './abstracts/converter.abstract';

export interface IFilesService {
  // convertBase64StringToFile(baseString: string, path: string): Promise<string>;
  save(base64String: string, type): Promise<string>;
}

@Injectable()
export class FilesService implements IFilesService {
  //@TODO = move to env and use full path better
  private basePathForFiles = '../shared/assets';

  private converter: ConverterAbstract;

  async getImage(pathWithExt: string, width: number, height: number): Promise<IImageInterfaceResponse> {
    // if(width && !Number.isInteger(width)) {
    //  throw new BadRequestException('width is not number');
    // }

    // if(height && !Number.isInteger(height)) {
    //  throw new BadRequestException('height is not number');
    // }
    const contentType = lookup(pathWithExt); // Получаем Content-Type по расширению файла

    const normalizedPathWithExt = this.getNormalizedPath(pathWithExt);
    const lastIndexOfDot = normalizedPathWithExt.lastIndexOf('.');
    const path = normalizedPathWithExt.slice(0, lastIndexOfDot);
    const ext = normalizedPathWithExt.slice(lastIndexOfDot + 1);

    if (!isEnum(ext, AllowedImageExtensions)) {
      throw new Error('Now allowed image extension');
    }

    const isFileExists = await this.isExists(pathWithExt);

    if (!isFileExists) {
      throw new Error('File Not Found');
    }

    if (!width && !height) {
      return {
        type: contentType,
        path: pathWithExt,
        new: false,
      };
    }

    const pathWithHeightAndWidth = `${path}_${width}_${height}.${ext}`;

    const isNewFileExists = await this.isExists(pathWithHeightAndWidth);

    if (isNewFileExists) {
      return {
        type: contentType,
        path: pathWithHeightAndWidth,
        new: false,
      };
    }

    const inputImageBuffer = await this.readFile(pathWithExt);
    const resizedImageBuffer = await this.resizeImage(inputImageBuffer, width, height);

    await this.writeFile(pathWithHeightAndWidth, resizedImageBuffer);

    return {
      type: contentType,
      path: pathWithHeightAndWidth,
      new: true,
    };
  }

  async save(source: string | Uint8Array, filename: string, type = FileType.DataUrl): Promise<string> {
    this.converter = this.factoryMethod(type);

    const bufferData = await this.converter.convert(source);
    let fileExt: string;

    if (isString(source)) {
      fileExt = source.split(';')[0].split('/')[1];
    }

    const filePath = await this.getFilePath(filename);

    try {
      // Write the decoded data to a file
      await writeFile(this.basePathForFiles + filePath + '.' + fileExt, bufferData, 'binary');

      return this.getNormalizedPath(filePath) + '.' + fileExt;
    } catch (error) {
      console.error(error);
    }

    throw new Error("Can't create a file");
  }

  private factoryMethod(type: FileType): ConverterAbstract {
    switch (type) {
      case FileType.DataUrl:
        return new DataUrlConverter();
        break;

      case FileType.Uint8Array:
        return new Uint8ArrayConverter();
        break;

      case FileType.Link:
        return new LinkConverter();
        break;

      // case FileType.Binary:
      //   return new BufferConverter();
      //   break
    }

    throw new Error(`Unsupported file type: ${type}`);
  }

  public async isExists(path: string): Promise<boolean> {
    return existsSync(this.basePathForFiles + path);
  }

  public async removeFile(path: string): Promise<void> {
    return rm(this.basePathForFiles + path);
  }

  public async readFile(path: string): Promise<Buffer> {
    return readFile(this.basePathForFiles + path);
  }

  public async resizeImage(file: Buffer, width: number, height: number): Promise<Buffer> {
    const resizedImage = await sharp(file)
      .resize(width || undefined, height || undefined, {
        fit: 'cover',
      })
      .toBuffer();

    return resizedImage;
  }

  public async mkdir(path: string): Promise<string> {
    return mkdir(path, { recursive: true });
  }

  public async writeFile(
    pathWithExt: string,
    data:
      | string
      | NodeJS.ArrayBufferView
      | Iterable<string | NodeJS.ArrayBufferView>
      | AsyncIterable<string | NodeJS.ArrayBufferView>
      | Stream,
  ): Promise<void> {
    return writeFile(this.basePathForFiles + pathWithExt, data);
  }

  private async getFilePath(filename: string): Promise<string> {
    const folderName = `/${new Date().getDate()}-${new Date().getMonth() + 1}-${new Date().getFullYear()}/`;

    const isExists = await this.isExists(this.basePathForFiles + folderName);

    if (!isExists) {
      await this.mkdir(this.basePathForFiles + folderName);
    }

    return folderName + filename;
  }

  private getNormalizedPath(filePath: string) {
    return normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    // return filePath.replace('..', '').replace('//', '/');
  }

  async downloadAndCreateDataUrl(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imageData = Buffer.from(response.data).toString('base64');
      const contentType = response.headers['content-type'];

      return `data:${contentType};base64,${imageData}`;
    } catch (error) {
      console.error('Error downloading or creating data URL:', error);

      throw error;
    }
  }

  getFullUrl(path: string): string {
    return `${IMAGE_ROUTER.PREFIX}/${IMAGE_ROUTER.IMAGE_GET}/?path=${path}`;
  }
}
