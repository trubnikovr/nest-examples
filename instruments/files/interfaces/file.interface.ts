export interface FileInterface {
  buffer: Buffer,
  filename: string,
  size: unknown,
  fileType: string
}

export enum FileType {
  DataUrl = 'DataUrl',
  Path = 'path',
  Link = 'link',
  Binary = 'Binary',
  Uint8Array = 'Binary',
  // Добавьте другие типы файлов по необходимости
}