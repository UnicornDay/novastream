
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoMetadata, UploadStatus, Comment } from './types';
import { analyzeVideoThumbnail } from './services/geminiService';
import { saveVideoBlob, getVideoBlob, deleteVideoBlob, clearAllBlobs } from './services/storageService';
import VideoCard from './components/VideoCard';
import VideoPlayer from './components/VideoPlayer';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
const ADMIN_PASSWORD = 'ert123';

const App: React.FC = () => {
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoMetadata | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ progress: 0, status: 'idle' });
  const [pendingDeletion, setPendingDeletion] = useState<{ id: string | 'all'; title: string } | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem('novastream_admin');
    if (auth === 'true') setIsAdmin(true);

    const saved = localStorage.getItem('novastream_videos');
    if (saved) {
      try {
        setVideos(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved videos", e);
      }
    }
  }, []);

  const saveToLocalStorage = useCallback((updatedVideos: VideoMetadata[]) => {
    localStorage.setItem('novastream_videos', JSON.stringify(updatedVideos));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      sessionStorage.setItem('novastream_admin', 'true');
      setShowLoginModal(false);
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('novastream_admin');
  };

  const handleAddComment = (videoId: string, text: string) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      author: isAdmin ? 'Admin' : 'Guest User',
      text,
      timestamp: new Date().toISOString(),
      isAdmin,
    };

    const updatedVideos = videos.map(v => {
      if (v.id === videoId) {
        return {
          ...v,
          comments: [...(v.comments || []), newComment]
        };
      }
      return v;
    });

    setVideos(updatedVideos);
    saveToLocalStorage(updatedVideos);

    // Update active video state to reflect new comment in UI
    if (activeVideo && activeVideo.id === videoId) {
      setActiveVideo({
        ...activeVideo,
        comments: [...(activeVideo.comments || []), newComment]
      });
    }
  };

  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => { video.currentTime = 1; };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        URL.revokeObjectURL(video.src);
        resolve(dataUrl);
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      setShowLoginModal(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadStatus({ progress: 0, status: 'error', error: "Invalid file type." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadStatus({ progress: 0, status: 'error', error: "File too large (Max 100MB)." });
      return;
    }

    setUploadStatus({ progress: 10, status: 'uploading' });

    try {
      const fileId = crypto.randomUUID();
      const extension = file.name.split('.').pop();
      const secureFileName = `${fileId}.${extension}`;

      setUploadStatus({ progress: 20, status: 'uploading' });
      await saveVideoBlob(fileId, file);
      
      setUploadStatus({ progress: 40, status: 'uploading' });
      const thumbnailUrl = await generateThumbnail(file);
      
      setUploadStatus({ progress: 60, status: 'analyzing' });
      const aiData = await analyzeVideoThumbnail(thumbnailUrl, file.name);
      
      const newVideo: VideoMetadata = {
        id: fileId,
        title: aiData.title || file.name,
        description: aiData.description || "Uploaded video.",
        fileName: secureFileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString(),
        thumbnailUrl: thumbnailUrl,
        videoUrl: '', 
        tags: aiData.tags || [],
        comments: [],
      };

      const updatedVideos = [newVideo, ...videos];
      setVideos(updatedVideos);
      saveToLocalStorage(updatedVideos);
      
      setUploadStatus({ progress: 100, status: 'complete' });
      setTimeout(() => setUploadStatus({ progress: 0, status: 'idle' }), 2000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setUploadStatus({ progress: 0, status: 'error', error: "Critical storage error." });
    }
  };

  const handleOpenVideo = async (video: VideoMetadata) => {
    setIsLoadingVideo(true);
    try {
      if (currentObjectUrlRef.current) URL.revokeObjectURL(currentObjectUrlRef.current);
      const blob = await getVideoBlob(video.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        currentObjectUrlRef.current = url;
        setActiveVideo({ ...video, videoUrl: url });
      } else {
        alert("Video data missing from storage.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleCloseVideo = () => {
    setActiveVideo(null);
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
  };

  const confirmDeletion = async () => {
    if (!isAdmin) return;
    if (!pendingDeletion) return;

    if (pendingDeletion.id === 'all') {
      await clearAllBlobs();
      setVideos([]);
      localStorage.removeItem('novastream_videos');
      handleCloseVideo();
    } else {
      await deleteVideoBlob(pendingDeletion.id);
      const updatedVideos = videos.filter(v => v.id !== pendingDeletion.id);
      setVideos(updatedVideos);
      saveToLocalStorage(updatedVideos);
      if (activeVideo?.id === pendingDeletion.id) handleCloseVideo();
    }
    setPendingDeletion(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-200">
      {isLoadingVideo && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-bold animate-pulse tracking-widest uppercase text-xs">Retrieving Media...</p>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="fa-solid fa-bolt text-white"></i>
            </div>
            <span className="text-xl font-black tracking-tight text-white uppercase italic">NovaStream</span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-800/50 flex items-center gap-2">
                  <i className="fa-solid fa-user-shield"></i> Admin Mode
                </span>
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/40"
                >
                  <i className="fa-solid fa-plus"></i> Upload
                </button>
                <button 
                  onClick={handleLogout} 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-full font-semibold flex items-center gap-2 border border-gray-700"
              >
                <i className="fa-solid fa-lock"></i> Admin Login
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileUpload} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {uploadStatus.status !== 'idle' && (
          <div className="mb-10 p-6 rounded-2xl border bg-blue-950/20 border-blue-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
               <span className="text-white font-bold">{uploadStatus.status === 'error' ? 'Error' : 'Processing...'}</span>
               <span className="text-blue-400 font-mono">{uploadStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${uploadStatus.progress}%` }} />
            </div>
            {uploadStatus.status === 'error' && <p className="text-red-400 text-sm mt-2">{uploadStatus.error}</p>}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white tracking-tight">Your Repository</h2>
          {(videos.length > 0 && isAdmin) && (
            <button onClick={() => setPendingDeletion({ id: 'all', title: 'ALL videos' })} className="text-gray-500 hover:text-red-500 text-sm flex items-center gap-2">
              <i className="fa-solid fa-trash-can"></i> Purge All
            </button>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-800 text-center">
            <i className="fa-solid fa-video-slash text-4xl mb-4 text-gray-700"></i>
            <h3 className="text-xl font-bold text-gray-400">No media found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map(video => (
              <VideoCard 
                key={video.id} 
                video={video} 
                isAdmin={isAdmin}
                onClick={() => handleOpenVideo(video)}
                onDelete={(id, e) => {
                   if(e) e.stopPropagation();
                   setPendingDeletion({ id, title: video.title });
                }}
              />
            ))}
          </div>
        )}
      </main>

      {activeVideo && (
        <VideoPlayer 
          video={activeVideo} 
          isAdmin={isAdmin}
          onClose={handleCloseVideo} 
          onAddComment={handleAddComment}
          onDelete={(id) => setPendingDeletion({ id, title: activeVideo.title })} 
        />
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-900/30">
                <i className="fa-solid fa-key text-2xl text-white"></i>
              </div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Admin Portal</h3>
              <p className="text-gray-500 text-sm mt-1">Enter your password to unlock management tools</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  autoFocus
                  placeholder="Enter Password" 
                  className={`w-full bg-gray-800 border ${loginError ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError('');
                  }}
                />
                {loginError && <p className="text-red-500 text-xs mt-2 ml-1">{loginError}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setPasswordInput('');
                    setLoginError('');
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/20"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDeletion && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-red-500"></i>
              Confirm Deletion
            </h3>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Are you sure you want to delete <span className="text-white font-bold">"{pendingDeletion.title}"</span>? 
              This will remove the file permanently from the database.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingDeletion(null)} className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white font-bold">Cancel</button>
              <button onClick={confirmDeletion} className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
