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
  User,
  Flashlight,
  FlashlightOff,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Star,
  RefreshCw
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
  const selectedAccountsRef = useRef<string[]>([]);
  const accountsRef = useRef(accounts);

  // Keep refs synchronized
  useEffect(() => {
    selectedAccountsRef.current = selectedAccounts;
  }, [selectedAccounts]);

  useEffect(() => {
    accountsRef.current = accounts;
  }, [accounts]);

  // Initialize selected accounts: select connected or all available accounts by default
  useEffect(() => {
    if (accounts.length === 0) return;

    setSelectedAccounts(prev => {
      // If already initialized with accounts that still exist, keep selection
      if (prev.length > 0) {
        const stillValid = prev.filter(id => accounts.some(a => a.id === id));
        if (stillValid.length > 0) return stillValid;
      }

      const connectedIds = accounts
        .filter(a => a.connectionStatus === 'CONNECTED')
        .map(a => a.id);

      if (connectedIds.length > 0) {
        return connectedIds;
      }
      if (primaryAccount) {
        return [primaryAccount.id];
      }
      return accounts.map(a => a.id);
    });
  }, [accounts, primaryAccount]);

  // Apply Camera Zoom (Hardware track zoom + CSS scale)
  const applyZoom = (zoomVal: number) => {
    const clamped = Math.max(1, Math.min(4, Math.round(zoomVal * 10) / 10));
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
        videoElem.style.transition = 'transform 0.1s ease-out';
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
        }
      }
    } catch {}
    setTorchOn(prev => !prev);
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
    if (!payloadToUse || !payloadToUse.trim()) {
      setErrorMsg('Please align camera over a valid attendance QR code.');
      return;
    }

    // Determine target account IDs robustly using latest ref and fallback
    let targetIds = selectedAccountsRef.current;
    if (!targetIds || targetIds.length === 0) {
      if (accountsRef.current.length > 0) {
        const connected = accountsRef.current.filter(a => a.connectionStatus === 'CONNECTED').map(a => a.id);
        targetIds = connected.length > 0 ? connected : accountsRef.current.map(a => a.id);
        setSelectedAccounts(targetIds);
      }
    }

    if (!targetIds || targetIds.length === 0) {
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
        targetAccountIds: targetIds,
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
          fps: 20
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
      className="relative w-full h-screen bg-black text-white overflow-hidden flex flex-col justify-between select-none font-sans"
    >
      {/* Top Header Bar matching Screenshot 2 */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
        {/* Left: Back Arrow + Mark Attendance Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1 -ml-1 text-white hover:opacity-80 transition-opacity"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
          <h1 className="text-lg font-bold text-white tracking-wide">
            Mark Attendance
          </h1>
        </div>

        {/* Right: Clock Icon + Fullscreen + Profile/User Icon with Green Badge */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/timetable')}
            className="text-white/90 hover:text-white transition-opacity p-1"
            title="Timetable / Schedule"
          >
            <Clock className="w-5 h-5 stroke-[2]" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="text-white/90 hover:text-white transition-opacity p-1"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 stroke-[2]" />
            ) : (
              <Maximize className="w-5 h-5 stroke-[2]" />
            )}
          </button>

          <button
            onClick={() => setShowSwitchModal(true)}
            className="relative text-white/90 hover:text-white transition-opacity p-1"
            title="Switch Accounts"
          >
            <User className="w-5 h-5 stroke-[2]" />
            <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#22c55e] text-black text-[10px] font-black flex items-center justify-center leading-none">
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

      {/* Center Target Box Overlay - Clean Modern Design */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none px-4">
        {/* Clean rounded scanning frame - no corner brackets */}
        <div className="relative w-72 h-52 sm:w-80 sm:h-56 flex items-center justify-center">
          {/* Outer subtle dark vignette around frame */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
          {/* Main clean blue glowing border */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              border: '2px solid rgba(99,102,241,0.85)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 0 20px rgba(99,102,241,0.35), inset 0 0 20px rgba(99,102,241,0.08)'
            }}
          />

          {/* Animated blue laser scan line */}
          {isScanning && (
            <div
              className="absolute left-3 right-3 h-[1.5px] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #818cf8, #c7d2fe, #818cf8, transparent)',
                boxShadow: '0 0 10px #818cf8, 0 0 20px rgba(129,140,248,0.4)',
                animation: 'scanLaser 2s ease-in-out infinite alternate'
              }}
            />
          )}
        </div>

        {/* Loading Indicator while Submitting */}
        {loading && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md shadow-2xl animate-pulse">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs font-bold text-emerald-300">
              Submitting attendance for {selectedAccounts.length} students...
            </span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-4 max-w-xs mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-950/90 border border-rose-500/50 backdrop-blur-md shadow-2xl pointer-events-auto">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-rose-200 truncate">{errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white ml-auto">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Instruction Capsule: "Align classroom QR inside frame" - moved lower */}
        <div className="mt-10 px-5 py-2 rounded-full bg-black/60 backdrop-blur-md text-[13px] font-medium text-white/90 shadow-md">
          Align classroom QR inside frame
        </div>

        {/* Account Selector Pill: "• Accounts (2/3)  [Switch]" */}
        <div className="mt-3.5 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md shadow-md pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
          <span className="text-xs font-semibold text-white/90">
            Accounts ({selectedAccounts.length}/{accounts.length || selectedAccounts.length})
          </span>
          <button
            onClick={() => setShowSwitchModal(true)}
            className="ml-0.5 px-3 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
          >
            Switch
          </button>
        </div>
      </div>

      {/* Bottom Area matching Screenshot 2: Zoom Slider Bar + Flashlight Button */}
      <div className="relative z-20 pb-7 pt-2 px-5 flex flex-col items-center gap-4">
        {/* Zoom Slider Control Container */}
        <div className="w-full max-w-xs bg-black/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3">
          {/* 1x Quick button */}
          <button
            onClick={() => applyZoom(1)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
              zoomLevel === 1
                ? 'bg-white text-black'
                : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            1×
          </button>

          {/* 2x Quick button */}
          <button
            onClick={() => applyZoom(2)}
            className={`w-7 h-7 rounded-full text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
              zoomLevel === 2
                ? 'bg-white text-black'
                : 'bg-transparent text-white/70 hover:text-white'
            }`}
          >
            2×
          </button>

          {/* Zoom Range Slider */}
          <input
            type="range"
            min="1"
            max="4"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            className="flex-1 accent-white h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />

          {/* Current Zoom Readout */}
          <span className="text-xs font-mono text-white/70 shrink-0 min-w-[28px] text-right">
            {zoomLevel.toFixed(1)}×
          </span>
        </div>

        {/* Circular Torch / Flashlight Button */}
        <button
          onClick={toggleTorch}
          className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg ${
            torchOn
              ? 'bg-amber-400 text-black shadow-[0_0_16px_#f59e0b]'
              : 'bg-black/60 text-white/90 border border-white/10 hover:bg-black/80'
          }`}
          title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
        >
          {torchOn ? (
            <Flashlight className="w-5 h-5 fill-current" />
          ) : (
            <FlashlightOff className="w-5 h-5 stroke-[2]" />
          )}
        </button>
      </div>

      {/* Switch Accounts Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Target Student Accounts</h3>
                  <p className="text-xs text-slate-500">
                    Selected for Attendance ({selectedAccounts.length}/{accounts.length})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                Select All ({accounts.length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-500 transition-all cursor-pointer"
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
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-sm ring-1 ring-emerald-400/40'
                        : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white font-bold'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 truncate">{acc.studentName}</p>
                          {acc.isPrimary && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-extrabold shrink-0 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Primary
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold shrink-0">
                            {acc.semester?.toUpperCase().includes('B') ? 'Div B' : 'Div A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          <span className="font-mono text-slate-700 font-semibold">{acc.prn}</span> • {acc.program}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold shrink-0 ml-2 ${
                        isConnected
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      CONNECTED
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
            <div className="pt-4 mt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSwitchModal(false)}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Done ({selectedAccounts.length} Selected)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Confirmation Result Sheet */}
      {batchResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-emerald-700 font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Attendance Confirmed
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">
                  {batchResult.subjectName || 'Course Attendance'} ({batchResult.subjectCode || 'SUB'})
                </h3>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                title="Go to Dashboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {batchResult.totalPresent} Marked Present
              </span>
              {batchResult.totalRequiresVerification > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                  {batchResult.totalRequiresVerification} Verification Needed
                </span>
              )}
              {batchResult.totalFailed > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                  {batchResult.totalFailed} Failed
                </span>
              )}
            </div>

            {/* List of target students and their status */}
            <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-3 mb-5">
              {batchResult.results.map((res, i) => (
                <div key={i} className="py-2.5 px-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{res.studentName}</p>
                    <p className="text-xs text-slate-500 truncate">{res.prn} • {res.message}</p>
                  </div>
                  {res.status === 'PRESENT' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                    </span>
                  )}
                  {res.status === 'FAILED' && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1 border border-rose-200 shrink-0">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons: Done (Redirect to Dashboard) & Scan Next */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" /> Done & Back to Dashboard
              </button>

              <button
                onClick={() => {
                  setBatchResult(null);
                  startScanner();
                }}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 whitespace-nowrap transition-all"
              >
                Scan Next QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for animations + hide html5-qrcode library overlays */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; opacity: 0.3; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.3; }
        }
        /* Hide all html5-qrcode library injected overlays and white frames */
        #qr-shaded-region,
        #qr-shaded-region *,
        [id*="shaded-region"],
        [id*="shaded-region"] *,
        #qr-reader__scan_region svg,
        #qr-reader__scan_region path,
        #qr-reader__scan_region div[style*="border"],
        #qr-reader__scan_region div[style*="Border"],
        #qr-reader__scan_region > div:not(:has(video)),
        #qr-reader__scan_region img,
        #qr-reader__scan_region > img,
        #qr-reader__dashboard,
        #qr-reader__header_message,
        #qr-reader__status_span,
        #qr-reader__camera_permission_button,
        #qr-reader__camera_selection,
        #qr-reader__filescan_input,
        .qr-shaded-region,
        [id^="qr-reader__"] > button,
        [id^="qr-reader__"] > select {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
        /* Remove any border/outline injected by html5-qrcode */
        #qr-reader {
          border: none !important;
          padding: 0 !important;
        }
        #qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
};
