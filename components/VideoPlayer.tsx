
import React, { useState } from 'react';
import { VideoMetadata, Comment } from '../types';

interface VideoPlayerProps {
  video: VideoMetadata;
  onClose: () => void;
  onDelete: (id: string) => void;
  onAddComment: (videoId: string, comment: string) => void;
  isAdmin: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose, onDelete, onAddComment, isAdmin }) => {
  const [commentText, setCommentText] = useState('');

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(video.id, commentText);
    setCommentText('');
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-6">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-red-500 text-2xl transition-colors z-[60]"
      >
        <i className="fa-solid fa-times"></i>
      </button>

      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 h-full max-h-[90vh]">
        {/* Left Side: Video and Info */}
        <div className="flex-grow flex flex-col gap-6 overflow-hidden">
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 aspect-video w-full flex-shrink-0">
            <video 
              src={video.videoUrl} 
              controls 
              autoPlay 
              className="w-full h-full"
            />
          </div>

          <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 overflow-y-auto flex-grow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{video.title}</h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="bg-gray-800 px-2 py-0.5 rounded uppercase font-mono">{video.type}</span>
                  <span>•</span>
                  <span>{(video.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>Uploaded {new Date(video.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                 {isAdmin && (
                   <button 
                     onClick={() => onDelete(video.id)}
                     className="flex items-center gap-2 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white px-4 py-2 rounded-lg font-medium transition-all border border-red-800/50"
                   >
                     <i className="fa-solid fa-trash-can"></i>
                     Delete
                   </button>
                 )}
                 <a 
                   href={video.videoUrl} 
                   download={video.fileName}
                   className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                 >
                   <i className="fa-solid fa-download"></i>
                   Download
                 </a>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-gray-400 font-semibold mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-align-left text-blue-500"></i>
                  Description
                </h4>
                <p className="text-gray-300 leading-relaxed text-sm">{video.description}</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {video.tags.map(tag => (
                  <span key={tag} className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs border border-gray-700">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Discussion Section */}
        <div className="w-full lg:w-96 flex flex-col bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-comments text-blue-500"></i>
              Discussion
              <span className="text-xs font-normal text-gray-500">({video.comments?.length || 0})</span>
            </h3>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {!video.comments || video.comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                <i className="fa-solid fa-comment-dots text-4xl mb-3"></i>
                <p className="text-sm">No comments yet.<br/>Be the first to speak!</p>
              </div>
            ) : (
              video.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 group">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${comment.isAdmin ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {getInitials(comment.author)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-200">{comment.author}</span>
                        {comment.isAdmin && (
                          <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800/50 flex items-center gap-1">
                            <i className="fa-solid fa-circle-check text-[8px]"></i> Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 leading-snug break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-900/80">
            <form onSubmit={handleCommentSubmit} className="relative">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none h-24"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Posting as {isAdmin ? 'Admin' : 'Guest'}
                </span>
                <button 
                  type="submit"
                  disabled={!commentText.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
