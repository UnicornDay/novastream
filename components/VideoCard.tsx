
import React from 'react';
import { VideoMetadata } from '../types';

interface VideoCardProps {
  video: VideoMetadata;
  onClick: (video: VideoMetadata) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isAdmin: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick, onDelete, isAdmin }) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      onClick={() => onClick(video)}
      className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500 transition-all cursor-pointer flex flex-col h-full"
    >
      <div className="relative aspect-video">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <i className="fa-solid fa-play text-4xl text-white"></i>
        </div>
        
        {/* Delete button visible only to admin on hover */}
        {isAdmin && (
          <button 
            onClick={(e) => onDelete(video.id, e)}
            className="absolute top-2 right-2 z-10 w-8 h-8 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
            title="Delete Video"
          >
            <i className="fa-solid fa-trash-can text-xs"></i>
          </button>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-bold text-lg text-gray-100 line-clamp-1 mb-1">{video.title}</h3>
        <p className="text-gray-400 text-sm line-clamp-2 mb-3 flex-grow">{video.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {video.tags.map(tag => (
            <span key={tag} className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-800/50">
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-800 pt-3">
          <span className="flex items-center gap-1">
            <i className="fa-regular fa-calendar"></i>
            {new Date(video.uploadDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-hard-drive"></i>
            {formatSize(video.size)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
