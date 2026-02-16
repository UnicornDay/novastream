
export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
  uploadDate: string;
  thumbnailUrl: string;
  videoUrl: string;
  aiAnalysis?: string;
  tags: string[];
  comments?: Comment[];
}

export interface UploadStatus {
  progress: number;
  status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
  error?: string;
}
