import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  Upload, 
  RefreshCw, 
  Flashlight, 
  FlashlightOff, 
  SwitchCamera, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Image as ImageIcon
} from 'lucide-react';

interface InventoryQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function InventoryQrScannerModal({ isOpen, onClose, onScanSuccess }: InventoryQrScannerModalProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'file'>('camera');
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'inventory-qr-reader-container';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1750, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext unavailable
    }
  };

  const triggerVibrate = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {
        // ignore
      }
    }
  };

  const handleScanHit = (decodedText: string) => {
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    playBeep();
    triggerVibrate();
    setLastScannedResult(cleanText);

    // Stop live scanner immediately
    stopScanner();

    // Call parent handler
    onScanSuccess(cleanText);
  };

  // Discover Available Cameras
  useEffect(() => {
    if (!isOpen || activeMode !== 'camera') return;

    let isMounted = true;
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (!isMounted) return;
        if (devices && devices.length > 0) {
          const list = devices.map(d => ({
            id: d.id,
            label: d.label || `Kamera ${d.id.slice(0, 5)}`
          }));
          setCameras(list);

          // Prefer back/environment camera for barcode scanning
          const backCam = list.find(c => /back|rear|belakang|environment/i.test(c.label));
          setSelectedCameraId(backCam ? backCam.id : list[0].id);
        } else {
          setErrorMessage('Tidak ditemukan kamera yang tersedia pada perangkat Anda.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Gagal memuat list kamera:', err);
        setErrorMessage('Izin akses kamera diperlukan untuk memindai QR Code.');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeMode]);

  // Start Scanner when camera is selected
  const startScanner = async (cameraId: string) => {
    if (!cameraId) return;
    setErrorMessage(null);

    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const qrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      html5QrCodeRef.current = qrCode;

      const qrBoxSize = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrSize = Math.floor(minEdge * 0.72);
        return {
          width: qrSize,
          height: qrSize
        };
      };

      await qrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: qrBoxSize,
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScanHit(decodedText);
        },
        () => {
          // ignore scan frame misses
        }
      );

      setIsScanning(true);

      // Check for torch capability
      try {
        const capabilities = qrCode.getRunningTrackCapabilities() as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.error('Gagal memulai scanner:', err);
      setIsScanning(false);
      setErrorMessage(
        err?.message?.includes('NotAllowedError') || err?.message?.includes('Permission')
          ? 'Izin kamera ditolak. Silakan berikan izin kamera pada browser Anda.'
          : 'Tidak dapat memulai scanner kamera. Pastikan kamera tidak sedang dipakai aplikasi lain.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
        setTorchOn(false);
      }
    }
  };

  // Toggle Flashlight/Torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  // Switch to next camera
  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIdx = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % cameras.length;
    const nextCamId = cameras[nextIdx].id;
    setSelectedCameraId(nextCamId);
    startScanner(nextCamId);
  };

  // Launch camera when selectedCameraId is ready
  useEffect(() => {
    if (isOpen && activeMode === 'camera' && selectedCameraId) {
      startScanner(selectedCameraId);
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeMode, selectedCameraId]);

  // Handle File/Image QR Scan
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setErrorMessage(null);

    try {
      const qrCode = new Html5Qrcode('inventory-qr-file-dummy', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ],
        verbose: false
      });

      const result = await qrCode.scanFile(file, true);
      await qrCode.clear();

      if (result) {
        handleScanHit(result);
      } else {
        setErrorMessage('QR Code atau Barcode tidak terdeteksi pada gambar yang diunggah.');
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setErrorMessage('QR Code atau Barcode tidak terdeteksi pada gambar. Pastikan gambar cukup terang dan fokus.');
    } finally {
      setIsFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0 leading-tight">
                Scan QR Code & Barcode Inventori
              </h3>
              <p className="text-[11px] text-blue-200 m-0">
                Pindai label material / batch / nomor LPN
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector (Kamera Live vs Upload Gambar) */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-blue-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Camera size={14} />
            <span>Kamera Live</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              setActiveMode('file');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeMode === 'file'
                ? 'bg-blue-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Upload size={14} />
            <span>Upload Foto QR</span>
          </button>
        </div>

        {/* Body Viewfinder */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-slate-900 relative min-h-[300px]">
          {activeMode === 'camera' ? (
            <div className="w-full flex flex-col items-center justify-center">
              {/* Live Video Scanner Container */}
              <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-square rounded-2xl overflow-hidden relative shadow-inner bg-black border-2 border-blue-500/50">
                <div id={scannerContainerId} className="w-full h-full object-cover"></div>

                {/* Laser Overlay Animation when scanning */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-3/4 h-3/4 border-2 border-dashed border-cyan-400/80 rounded-xl relative overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                      {/* Scanning animated beam */}
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls below camera */}
              <div className="flex items-center justify-center gap-3 mt-3 w-full">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Ganti Kamera Depan/Belakang"
                  >
                    <SwitchCamera size={14} />
                    <span>Ganti Kamera</span>
                  </button>
                )}

                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      torchOn
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
                    }`}
                    title="Lampu Flash"
                  >
                    {torchOn ? <FlashlightOff size={14} /> : <Flashlight size={14} />}
                    <span>{torchOn ? 'Matikan Lampu' : 'Nyalakan Lampu'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Refresh Scanner"
                >
                  <RefreshCw size={14} className={isScanning ? '' : 'animate-spin'} />
                  <span>Ulangi</span>
                </button>
              </div>
            </div>
          ) : (
            /* Upload Image QR Mode */
            <div className="w-full flex flex-col items-center justify-center py-6 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-900/40 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-3">
                <ImageIcon size={30} />
              </div>

              <h4 className="text-white font-bold text-sm mb-1">Upload Foto / Screenshot QR</h4>
              <p className="text-slate-400 text-xs max-w-xs mb-4">
                Pilih file gambar barcode atau QR code dari galeri perangkat Anda
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileScan}
                className="hidden"
                id="inventory-file-qr-input"
              />

              <label
                htmlFor="inventory-file-qr-input"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                {isFileLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menganalisis Gambar...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Pilih Gambar Dari Galeri</span>
                  </>
                )}
              </label>

              {/* Hidden dummy element for file scanner */}
              <div id="inventory-qr-file-dummy" className="hidden"></div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-start gap-2 max-w-sm">
              <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Gagal Scan:</span> {errorMessage}
              </div>
            </div>
          )}

          {/* Success Scan Hit Preview */}
          {lastScannedResult && (
            <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center gap-2 max-w-sm animate-in zoom-in-95 duration-150">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold">Terbaca:</span>{' '}
                <span className="font-mono font-bold text-white bg-emerald-900/80 px-1.5 py-0.5 rounded">
                  {lastScannedResult}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            Format didukung: QR Code, Code 128, EAN, Data Matrix
          </span>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
