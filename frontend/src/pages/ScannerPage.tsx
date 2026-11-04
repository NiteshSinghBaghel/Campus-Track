import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../context/AccountContext.js';
import { api } from '../services/api.js';
import { GroupAttendanceBatchResponse } from '../types/index.js';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ArrowLeft,
  Clock,
  Maximize,
  Minimize,
  Users,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Star,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const ScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { accounts, primaryAccount } = useAccounts();
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedPayload, setLastScannedPayload] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<GroupAttendanceBatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchOn, setTorchOn] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [challengeAnswers, setChallengeAnswers] = useState<Record<string, string>>({});

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize selected accounts: select all connected accounts by default
  useEffect(() => {
    const connectedIds = accounts
      .filter(a => a.connectionStatus === 'CONNECTED')
      .map(a => a.id);

    if (connectedIds.length > 0) {
      setSelectedAccounts(connectedIds);
    } else if (primaryAccount) {
      setSelectedAccounts([primaryAccount.id]);
    } else if (accounts.length > 0) {
      setSelectedAccounts(accounts.map(a => a.id));
    }
  }, [accounts, primaryAccount]);

  // Apply Camera Zoom (Hardware constraint + CSS transform scale fallback)
  const applyZoom = (zoomVal: number) => {
    const clamped = Math.max(1, Math.min(4, zoomVal));
    setZoomLevel(clamped);

    // 1. Hardware camera track zoom
    try {
      const videoElem = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.zoom) {
          track.applyConstraints({ advanced: [{ zoom: clamped }] } as any).catch(() => {});
        }
      }
    } catch {}

    // 2. CSS transform scale for instant visual magnification
    try {
      const videoElem = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElem) {
        videoElem.style.transform = `scale(${clamped})`;
        videoElem.style.transformOrigin = 'center center';
        videoElem.style.transition = 'transform 0.15s ease-out';
      }
    } catch {}
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    try {
      const videoElem = document.querySelector('#qr-reader video') as HTMLVideoElement;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
          setTorchOn(!torchOn);
        } else {
          setTorchOn(!torchOn);
        }
      }
    } catch {
      setTorchOn(!torchOn);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Submit attendance for target accounts
  const handleAttendanceSubmit = async (payloadToUse: string) => {
    if (!payloadToUse.trim()) {
      setErrorMsg('Please align camera over a valid faculty attendance QR code.');
      return;
    }

    if (selectedAccounts.length === 0) {
      setErrorMsg('Please select at least one account via the Switch button.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      // Play short success chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch {}

      const res = await api.submitOneScan({
        qrPayload: payloadToUse,
        targetAccountIds: selectedAccounts,
        challengeResponses: challengeAnswers
      });

      setBatchResult(res);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    if (isStoppingRef.current) return;
    try {
      setCameraError(null);

      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      const qrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 280 }
        },
        async (decodedText) => {
          if (decodedText === lastScannedPayload && isScanning) return;

          setLastScannedPayload(decodedText);

          try {
            if (html5QrCodeRef.current?.isScanning) {
              await html5QrCodeRef.current.stop();
              setIsScanning(false);
            }
          } catch (e) {
            console.warn('Error pausing scanner:', e);
          }

          // Auto-submit attendance immediately
          await handleAttendanceSubmit(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
      if (zoomLevel > 1) {
        setTimeout(() => applyZoom(zoomLevel), 300);
      }
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : `Camera error: ${err?.message || 'Unable to start camera sensor'}`
      );
    }
  };

  // Auto-start scanner on page mount
  useEffect(() => {
    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Account toggle handlers
  const handleToggleAccount = (id: string) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedAccounts(accounts.map(a => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedAccounts([]);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2.5 text-white hover:text-white/80 transition-all text-sm font-semibold tracking-wide"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
          <span className="truncate max-w-[130px] sm:max-w-none">Mark Attenda...</span>
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/attendance')}
            className="p-1.5 text-white/80 hover:text-white transition-all"
            title="Attendance History"
          >
            <Clock className="w-5 h-5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-white/80 hover:text-white transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* User Counter Badge with green pill */}
          <button
            onClick={() => setShowSwitchModal(true)}
            className="relative p-1 text-white/80 hover:text-white transition-all"
            title="Select & Manage Accounts"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2 bg-[#22c55e] text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_8px_#22c55e]">
              {selectedAccounts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Camera Video Viewport (Background) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-black">
        <div
          id="qr-reader"
          className="w-full h-full object-cover flex items-center justify-center text-white"
        ></div>

        {/* Camera Permission Error Overlay */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center z-30">
            <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
            <p className="text-sm font-semibold text-white max-w-sm">{cameraError}</p>
            <button
              onClick={startScanner}
              className="mt-4 px-5 py-2.5 bg-[#22c55e] hover:bg-emerald-400 text-black font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Center Target Box Overlay with Glowing Green Neon Reticle */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none px-4">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72">
          {/* Top-Left Corner */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-[3.5px] border-l-[3.5px] border-[#22c55e] rounded-tl-[24px] shadow-[0_0_12px_#22c55e]" />
          {/* Top-Right Corner */}
          <div className="absolute top-0 right-0 w-12 h-12 border-t-[3.5px] border-r-[3.5px] border-[#22c55e] rounded-tr-[24px] shadow-[0_0_12px_#22c55e]" />
          {/* Bottom-Left Corner */}
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[3.5px] border-l-[3.5px] border-[#22c55e] rounded-bl-[24px] shadow-[0_0_12px_#22c55e]" />
          {/* Bottom-Right Corner */}
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[3.5px] border-r-[3.5px] border-[#22c55e] rounded-br-[24px] shadow-[0_0_12px_#22c55e]" />

          {/* Animated Neon Green Laser Scanning Line */}
          {isScanning && (
            <div
              className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_16px_#22c55e] rounded-full animate-pulse"
              style={{
                top: '50%',
                animation: 'scanLaser 2.2s ease-in-out infinite alternate'
              }}
            />
          )}
        </div>

        {/* Reticle Instruction Pill */}
        <div className="mt-5 px-5 py-2 rounded-full bg-[#18181b]/90 border border-white/10 backdrop-blur-md text-xs font-medium text-white/95 shadow-lg tracking-wide">
          Align classroom QR inside frame
        </div>

        {/* Selected Accounts Pill with Switch Button */}
        <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181b]/90 border border-white/15 backdrop-blur-md shadow-xl pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span className="text-xs font-semibold text-white/90">
            Accounts ({selectedAccounts.length}/{accounts.length})
          </span>
          <button
            onClick={() => setShowSwitchModal(true)}
            className="ml-1 px-3 py-0.5 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[11px] font-bold text-white transition-all border border-white/10"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Bottom Controls Area (Zoom Bar & Torch) */}
      <div className="relative z-20 flex flex-col items-center pb-8 pt-4 px-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent space-y-4">
        {/* Floating Capsule Zoom Control */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#18181b]/90 border border-white/15 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => applyZoom(1.0)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              zoomLevel === 1.0 ? 'bg-white text-black shadow-md' : 'text-white/80 hover:text-white'
            }`}
          >
            1×
          </button>

          <button
            onClick={() => applyZoom(2.0)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              zoomLevel === 2.0 ? 'bg-white text-black shadow-md' : 'text-white/80 hover:text-white'
            }`}
          >
            2×
          </button>

          {/* Range Slider Track */}
          <div className="relative flex items-center w-28 sm:w-36 px-1">
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.1"
              value={zoomLevel}
              onChange={e => applyZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          <span className="text-[11px] font-mono text-white/80 w-8 text-right font-medium">
            {zoomLevel.toFixed(1)}×
          </span>
        </div>

        {/* Circular Torch / Flashlight Button */}
        <button
          onClick={toggleTorch}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all shadow-xl ${
            torchOn
              ? 'bg-amber-400 border-amber-300 text-black shadow-[0_0_15px_#f59e0b]'
              : 'bg-[#18181b]/90 border-white/20 text-white/90 hover:bg-white/10 hover:border-white/40'
          }`}
          title={torchOn ? 'Turn off light' : 'Turn on light'}
        >
          {torchOn ? <Flashlight className="w-5 h-5 fill-current" /> : <FlashlightOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Switch Accounts Modal (Select & Deselect Registered Student Profiles) */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Target Student Accounts</h3>
                  <p className="text-xs text-slate-400">
                    Selected for One-Scan Attendance ({selectedAccounts.length}/{accounts.length})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all"
              >
                Select All ({accounts.length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400 transition-all"
              >
                Deselect All
              </button>
            </div>

            {/* Registered Accounts List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-80">
              {accounts.map(acc => {
                const isSelected = selectedAccounts.includes(acc.id);
                const isConnected = acc.connectionStatus === 'CONNECTED';

                return (
                  <div
                    key={acc.id}
                    onClick={() => handleToggleAccount(acc.id)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-white truncate">{acc.studentName}</p>
                          {acc.isPrimary && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold shrink-0 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {acc.prn} • {acc.program}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ml-2 ${
                        isConnected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {acc.connectionStatus}
                    </span>
                  </div>
                );
              })}

              {accounts.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No accounts linked yet. Go to <strong>Accounts</strong> to connect Juno profiles.
                </div>
              )}
            </div>

            {/* Done Button */}
            <div className="pt-4 mt-3 border-t border-slate-800">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Done ({selectedAccounts.length} Selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Confirmation Result Sheet */}
      {batchResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
                  Attendance Confirmed
                </span>
                <h3 className="font-extrabold text-base text-white mt-0.5">
                  {batchResult.subjectName || 'Course Attendance'} ({batchResult.subjectCode || 'SUB'})
                </h3>
              </div>
              <button
                onClick={() => {
                  setBatchResult(null);
                  startScanner();
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                {batchResult.totalPresent} Present
              </span>
              {batchResult.totalRequiresVerification > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  {batchResult.totalRequiresVerification} Verification Needed
                </span>
              )}
              {batchResult.totalFailed > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                  {batchResult.totalFailed} Failed
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-800">
              {batchResult.results.map((res, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-xs text-white">{res.studentName}</p>
                    <p className="text-[11px] text-slate-400">{res.prn} • {res.message}</p>
                  </div>
                  {res.status === 'PRESENT' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                    </span>
                  )}
                  {res.status === 'FAILED' && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-500/30">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setBatchResult(null);
                startScanner();
              }}
              className="mt-6 w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              Scan Next Classroom QR
            </button>
          </div>
        </div>
      )}

      {/* Global CSS for the Neon Laser Animation */}
      <style>{`
        @keyframes scanLaser {
          0% {
            top: 5%;
            opacity: 0.2;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 92%;
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
};
