export interface FileInfo {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'other';
  size: number; // in bytes
  uploadDate: Date;
}

export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
}
