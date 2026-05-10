import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, CheckCircle } from "lucide-react";

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (photoData: string) => void;
  staffName: string;
  action: "check-in" | "check-out" | "break-in" | "break-out";
}

export function CheckInOutModal({ isOpen, onClose, onSubmit, staffName, action }: CheckInOutModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please ensure you have granted camera permissions.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
      }
    };
  }, [isOpen, capturedPhoto, startCamera, stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Add timestamp overlay
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    
    // Draw overlay background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(20, canvas.height - 80, 300, 60);
    
    // Draw text
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(dateStr, 30, canvas.height - 50);
    ctx.fillText(timeStr, 30, canvas.height - 25);
    
    // Convert to data URL
    const photoData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedPhoto(photoData);
    setIsCapturing(false);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleSubmit = () => {
    if (capturedPhoto) {
      onSubmit(capturedPhoto);
      setCapturedPhoto(null);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const formattedDate = currentTime.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const formattedTime = currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const actionLabels = {
    "check-in": "Check In",
    "check-out": "Check Out",
    "break-in": "Break In",
    "break-out": "Break Out",
  };
  const actionLabel = actionLabels[action];

  // Tailwind class mappings (must be static for compilation)
  const actionButtonClasses = {
    "check-in": "bg-emerald-600 hover:bg-emerald-700",
    "check-out": "bg-orange-600 hover:bg-orange-700",
    "break-in": "bg-amber-600 hover:bg-amber-700",
    "break-out": "bg-amber-600 hover:bg-amber-700",
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/50 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-navy-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-black text-navy-900">{actionLabel}</h3>
            <p className="text-sm text-navy-500">{staffName}</p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-navy-400 transition-colors hover:bg-navy-50 hover:text-navy-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Date/Time Display */}
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-3">
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-medium">{formattedDate}</span>
            <span className="text-lg font-black">{formattedTime}</span>
          </div>
        </div>

        {/* Camera / Preview */}
        <div className="relative aspect-video bg-navy-950">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-sm text-navy-300">{error}</p>
            </div>
          ) : capturedPhoto ? (
            <img 
              src={capturedPhoto} 
              alt="Captured" 
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
          
          {/* Overlay for camera mode */}
          {!capturedPhoto && !error && (
            <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-2 text-white">
              <p className="text-xs font-medium">Position your face in frame</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-navy-100 p-4">
          {capturedPhoto ? (
            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className="flex-1 rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm font-bold text-navy-700 transition-colors hover:bg-navy-50"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 ${actionButtonClasses[action]}`}
              >
                <CheckCircle className="h-4 w-4" />
                Confirm {actionLabel}
              </button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              disabled={isCapturing || !!error}
              className={`w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${actionButtonClasses[action]}`}
            >
              {isCapturing ? "Capturing..." : `Take Photo & ${actionLabel}`}
            </button>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
