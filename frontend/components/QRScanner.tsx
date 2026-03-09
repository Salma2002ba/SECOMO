import React, { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onCode: (code: string) => void;
  isDark?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ onCode, isDark }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'choice' | 'qr' | 'manual'>('choice');
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  // Nettoyage du stream caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setScanning(false);
  };

  useEffect(() => {
    if (mode !== 'qr') { stopCamera(); return; }

    const start = async () => {
      setScanError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        if (!('BarcodeDetector' in window)) {
          setScanError('Votre navigateur ne supporte pas le scan QR. Utilisez la saisie manuelle.');
          stopCamera();
          return;
        }

        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stopCamera();
              onCode(codes[0].rawValue);
              return;
            }
          } catch { /* continue */ }
          animRef.current = requestAnimationFrame(scan);
        };

        animRef.current = requestAnimationFrame(scan);
      } catch (e: any) {
        setScanError('Accès à la caméra refusé. Utilisez la saisie manuelle.');
        stopCamera();
      }
    };

    start();
    return () => stopCamera();
  }, [mode]);

  if (mode === 'choice') {
    return (
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
          Lier au bac physique (ESP32)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('qr')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all hover:border-emerald-500 ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-emerald-500/10' : 'border-slate-200 bg-slate-50 hover:bg-emerald-50'}`}
          >
            <i className="fas fa-qrcode text-2xl text-emerald-500"></i>
            <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Scanner QR Code</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all hover:border-emerald-500 ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-emerald-500/10' : 'border-slate-200 bg-slate-50 hover:bg-emerald-50'}`}
          >
            <i className="fas fa-keyboard text-2xl text-emerald-500"></i>
            <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Saisie manuelle</span>
          </button>
        </div>
        <p className={`text-[10px] italic ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Optionnel — vous pouvez lier le bac plus tard.
        </p>
      </div>
    );
  }

  if (mode === 'qr') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
            Scanner le QR Code de l'ESP32
          </p>
          <button onClick={() => setMode('choice')} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <i className="fas fa-arrow-left text-[10px]"></i> Retour
          </button>
        </div>
        <div className={`relative rounded-2xl overflow-hidden aspect-square max-h-56 flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-36 border-4 border-emerald-400 rounded-xl opacity-70 animate-pulse"></div>
            </div>
          )}
          {!scanning && !scanError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-camera text-3xl text-slate-400 animate-pulse"></i>
            </div>
          )}
        </div>
        {scanError && (
          <div className="space-y-2">
            <p className="text-xs text-rose-400 flex items-center gap-2"><i className="fas fa-exclamation-circle"></i>{scanError}</p>
            <button onClick={() => setMode('manual')} className="text-xs text-emerald-500 font-bold hover:underline">
              Passer à la saisie manuelle →
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mode manual
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
          Code physique de l'ESP32
        </p>
        <button onClick={() => setMode('choice')} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
          <i className="fas fa-arrow-left text-[10px]"></i> Retour
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={e => setManualCode(e.target.value)}
          placeholder="Ex: a3f8c1d2e5... (clé API ESP32)"
          className={`flex-1 rounded-2xl p-4 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 text-slate-800'}`}
        />
        <button
          onClick={() => { if (manualCode.trim()) onCode(manualCode.trim()); }}
          disabled={!manualCode.trim()}
          className="px-5 rounded-2xl bg-emerald-600 text-white font-bold disabled:opacity-40 transition-all hover:bg-emerald-700"
        >
          <i className="fas fa-link"></i>
        </button>
      </div>
      <p className={`text-[10px] italic ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Trouvez la clé API dans la config de votre ESP32 ou sur l'étiquette du bac.
      </p>
    </div>
  );
};

export default QRScanner;
