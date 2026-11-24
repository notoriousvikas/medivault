import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  X,
  ScanLine,
  Camera,
  UploadCloud,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  User,
  Heart,
  RefreshCw,
  QrCode,
  ArrowRight,
  VideoOff,
} from 'lucide-react';
import { consultationsApi } from '../../api/consultations';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function DoctorPatientScannerModal({
  isOpen,
  onClose,
  onPatientAdmitted,
}) {
  const { user } = useAuth();
  const toast = useToast();

  const isDoctor = user?.role === 'doctor';

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'upload' | 'manual'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual input state
  const [tokenInput, setTokenInput] = useState('');

  // Camera stream & scanning state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const isScanningRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Scanned preview state
  const [admittedPatient, setAdmittedPatient] = useState(null);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Execute scan / submit to API
  const handleAdmitPatient = useCallback(
    async (payload) => {
      setLoading(true);
      setError(null);

      try {
        const res = await consultationsApi.scanAndAddPatient(payload);
        const { consultation, patient, isNew } = res.data;

        setAdmittedPatient(patient);
        stopCamera();

        toast.success(
          isNew ? 'Patient Registered' : 'Consultation Loaded',
          `Patient ${patient.name || 'Patient'} registered to your consultation room.`
        );

        if (onPatientAdmitted) {
          onPatientAdmitted(consultation);
        }

        // Auto close after preview confirmation
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to register patient.';
        setError(msg);
        toast.error('Registration Error', msg);
        // Resume scanning if error occurred so doctor can retry
        isScanningRef.current = true;
      } finally {
        setLoading(false);
      }
    },
    [onPatientAdmitted, onClose, stopCamera, toast]
  );

  // Start continuous QR scan frame processing via jsQR
  const startScanLoop = useCallback(() => {
    if (!scanCanvasRef.current) {
      scanCanvasRef.current = document.createElement('canvas');
    }
    const canvas = scanCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let lastScanTime = 0;

    const scanFrame = (timestamp) => {
      if (!isScanningRef.current) return;

      const video = videoRef.current;
      if (video && !loading) {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          // Scan roughly every 120ms for low CPU usage while staying instant
          if (timestamp - lastScanTime >= 120) {
            lastScanTime = timestamp;

            const width = video.videoWidth;
            const height = video.videoHeight;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(video, 0, 0, width, height);

            try {
              const imageData = ctx.getImageData(0, 0, width, height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth',
              });

              if (code && code.data && code.data.trim()) {
                const scannedRaw = code.data.trim();
                isScanningRef.current = false;
                stopCamera();
                handleAdmitPatient({ qrData: scannedRaw });
                return;
              }
            } catch (err) {
              console.warn('Scan frame decode error:', err);
            }
          }
        }
      }

      if (isScanningRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    isScanningRef.current = true;
    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [loading, handleAdmitPatient, stopCamera]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment (requires HTTPS or localhost).');
      return;
    }

    try {
      let stream;
      try {
        // Try preferred environment camera with dimensions
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn('Constrained camera request failed, falling back to basic video:', constraintErr);
        // Fallback for devices/webcams that fail specific constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('video.play() failed:', playErr);
        }
      }
      startScanLoop();
    } catch (err) {
      console.warn('Camera access error:', err);
      let errMsg = 'Unable to access device camera. Please check camera connections or use QR image upload.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission was denied. Please allow camera permissions in your browser or use manual ID entry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. Please connect a webcam or use QR upload/manual entry.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera is already in use by another application. Please close other camera apps and retry.';
      }
      setCameraError(errMsg);
      setCameraActive(false);
    }
  }, [stopCamera, startScanLoop]);

  // Ensure stream is bound to video element if video mounts or changes
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.muted = true;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    }
  }, [cameraActive]);

  // Manage camera on modal open/close & tab change
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && isDoctor && !admittedPatient) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen, activeTab, isDoctor, admittedPatient, startCamera, stopCamera]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAdmittedPatient(null);
      setTokenInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle image upload decode via jsQR
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      URL.revokeObjectURL(objectUrl);

      if (code && code.data && code.data.trim()) {
        await handleAdmitPatient({ qrData: code.data.trim() });
      } else {
        setError('No QR code detected in this image. Please ensure the QR code is clear and in focus, or enter the patient ID manually.');
      }
    } catch (err) {
      setError('Could not decode QR image: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter a patient ID, registration code, or email.');
      return;
    }

    const trimmed = tokenInput.trim();
    if (trimmed.includes('@')) {
      handleAdmitPatient({ patientEmail: trimmed });
    } else {
      handleAdmitPatient({ qrData: trimmed, patientId: trimmed, token: trimmed });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-trust-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-trust-600/20">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-navy-900">Doctor Patient Registration Scanner</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Doctor Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Scan patient's Registration QR code to register them directly under your clinical care
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor-only Guard */}
        {!isDoctor ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-navy-900">Access Restricted</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Only verified medical practitioners with active doctor accounts can scan and register patients to consultations.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        ) : admittedPatient ? (
          /* Admitted Success Confirmation Card */
          <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Patient Registered Successfully
              </span>
              <h4 className="text-xl font-black text-navy-900 mt-2">{admittedPatient.name}</h4>
              <p className="text-xs text-slate-500">
                Blood Group: <strong className="text-slate-700">{admittedPatient.bloodGroup || 'O+'}</strong> • Age: {admittedPatient.age || 'Adult'}
              </p>
            </div>

            {admittedPatient.allergies?.length > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-800">
                <span className="font-bold flex items-center gap-1 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Allergies Alert:
                </span>
                <span>{admittedPatient.allergies.join(', ')}</span>
              </div>
            )}

            <p className="text-xs text-slate-400">Opening active consultation room...</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'camera'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload QR</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'manual'
                    ? 'bg-white text-navy-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Manual ID / Code</span>
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: Camera Scanner */}
            {activeTab === 'camera' && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border-2 border-slate-700">
                  {/* Video element is always mounted so ref and stream are immediately connected */}
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                    autoPlay
                  />

                  {cameraActive ? (
                    <>
                      {/* Scanning Target Reticle & Laser */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 border-2 border-trust-400/80 rounded-2xl relative shadow-lg">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-trust-400 rounded-tl-md" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-trust-400 rounded-tr-md" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-trust-400 rounded-bl-md" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-trust-400 rounded-br-md" />

                          {/* Animated laser line */}
                          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-pulse absolute top-1/2" />
                        </div>
                      </div>

                      <div className="absolute bottom-2 inset-x-0 text-center">
                        <span className="px-3 py-1 bg-black/60 backdrop-blur-sm text-[11px] font-bold text-white rounded-full shadow">
                          Align patient's registration QR code inside box
                        </span>
                      </div>

                      {/* Stop Camera button overlay */}
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-[11px] font-semibold text-white rounded-lg transition"
                      >
                        Stop Camera
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <VideoOff className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {cameraError || 'Camera inactive. Click below to start live QR scanner.'}
                      </p>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-trust-600 hover:bg-trust-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-trust-600/30"
                      >
                        Start Camera
                      </button>
                    </div>
                  )}

                  {loading && (
                    <div className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                      <RefreshCw className="w-8 h-8 animate-spin text-trust-400" />
                      <span className="text-xs font-bold">Registering patient...</span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  💡 Have the patient show their Registration QR code on their phone or card to register them immediately.
                </p>
              </div>
            )}

            {/* TAB 2: Image Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-slate-300 hover:border-trust-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition hover:bg-slate-50/50">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Click to browse or drop patient QR image here
                  </span>
                  <span className="text-[11px] text-slate-400">Instant automatic decode via pure JS engine</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                {loading && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-trust-600 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Decoding QR image & registering...</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Manual Entry */}
            {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Patient Registration Code, ID, or Email
                  </label>
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. 673... or patient@email.com or code"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500/20 focus:border-trust-600 font-mono"
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enter the patient's ID shown below their QR code, or their registered email address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !tokenInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-trust-600 to-indigo-600 hover:from-trust-700 hover:to-indigo-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-trust-600/30"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering Patient...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Register Patient to Consultation</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
