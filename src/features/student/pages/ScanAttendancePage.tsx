import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { QrCode, Camera, CameraOff, CircleCheck as CheckCircle2, Circle as XCircle, RefreshCw, ScanLine, CircleAlert as AlertCircle } from 'lucide-react';
import { useSubmitAttendance } from '../hooks/useStudentQueries';
import { PageHeader } from '@/features/administrator/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ScanState = 'idle' | 'scanning' | 'success' | 'error' | 'denied';

interface ParsedQR {
  session_id: string;
  qr_token: string;
}

export default function ScanAttendancePage() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [lastResult, setLastResult] = useState<{ subject?: string; date?: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const submitMut = useSubmitAttendance();

  async function startCamera() {
    setScanState('scanning');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setScanState('denied');
      setErrorMessage('Camera access was denied. You can enter the token manually below.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function parseQR(text: string): ParsedQR | null {
    try {
      const parsed = JSON.parse(text);
      if (parsed.session_id && parsed.qr_token) return parsed as ParsedQR;
    } catch {
      // Not JSON — try pipe-separated format: session_id|qr_token
      const parts = text.split('|');
      if (parts.length === 2 && parts[0] && parts[1]) {
        return { session_id: parts[0], qr_token: parts[1] };
      }
    }
    return null;
  }

  async function submitAttendance(sessionId: string, qrToken: string) {
    stopCamera();
    try {
      const result = await submitMut.mutateAsync({ session_id: sessionId, qr_token: qrToken });
      setLastResult({
        subject: result?.record?.subject ?? 'Session',
        date: new Date().toLocaleString(),
      });
      setScanState('success');
      toast.success('Attendance marked successfully!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit attendance.';
      setErrorMessage(msg);
      setScanState('error');
      toast.error(msg);
    }
  }

  function handleManualSubmit() {
    const parsed = parseQR(manualToken.trim());
    if (!parsed) {
      toast.error('Invalid QR token format.');
      return;
    }
    submitAttendance(parsed.session_id, parsed.qr_token);
  }

  function reset() {
    setScanState('idle');
    setErrorMessage('');
    setManualToken('');
    setLastResult(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Scan Attendance" description="Scan the QR code displayed by your lecturer to mark attendance." />

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {/* IDLE */}
          {scanState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/10 to-emerald-500/10">
                    <QrCode className="h-10 w-10 text-sky-600" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Ready to Scan</h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Click the button below to open your camera and scan the attendance QR code.
                  </p>
                  <Button className="mt-6 gap-2" onClick={startCamera}>
                    <Camera className="h-4 w-4" />
                    Open Camera
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SCANNING */}
          {scanState === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ScanLine className="h-5 w-5 text-sky-600" />
                      Scanning…
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => { stopCamera(); reset(); }}>
                      Cancel
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                    <video
                      ref={videoRef}
                      className="h-80 w-full object-contain"
                      playsInline
                      muted
                    />
                    {/* Scan overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative h-48 w-48 rounded-xl border-2 border-white/80">
                        <motion.div
                          animate={{ y: [-96, 96, -96] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute left-0 right-0 h-0.5 bg-sky-400 shadow-[0_0_12px_2px_rgba(56,189,248,0.6)]"
                        />
                        <div className="absolute -top-1 -left-1 h-6 w-6 border-t-2 border-l-2 border-sky-400 rounded-tl-lg" />
                        <div className="absolute -top-1 -right-1 h-6 w-6 border-t-2 border-r-2 border-sky-400 rounded-tr-lg" />
                        <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-2 border-l-2 border-sky-400 rounded-bl-lg" />
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-2 border-r-2 border-sky-400 rounded-br-lg" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-sm text-slate-500">
                    Point your camera at the QR code. It will be detected automatically.
                  </p>
                  <ManualEntry
                    manualToken={manualToken}
                    setManualToken={setManualToken}
                    onSubmit={handleManualSubmit}
                    disabled={submitMut.isPending}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* SUCCESS */}
          {scanState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-emerald-200">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
                  >
                    <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-900">Attendance Marked!</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your attendance has been recorded successfully.
                  </p>
                  {lastResult && (
                    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-left">
                      <p className="text-sm font-medium text-slate-800">{lastResult.subject}</p>
                      <p className="text-xs text-slate-500">{lastResult.date}</p>
                    </div>
                  )}
                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={reset}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Scan Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ERROR */}
          {scanState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="border-rose-200">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100"
                  >
                    <XCircle className="h-12 w-12 text-rose-600" strokeWidth={1.5} />
                  </motion.div>
                  <h3 className="text-xl font-semibold text-slate-900">Attendance Failed</h3>
                  <p className="mt-1 max-w-sm text-sm text-rose-600">{errorMessage}</p>
                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={reset}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CAMERA DENIED */}
          {scanState === 'denied' && (
            <motion.div
              key="denied"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
                    <CameraOff className="h-8 w-8 text-amber-600" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Camera Unavailable</h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">{errorMessage}</p>
                  <div className="mt-6 w-full max-w-md">
                    <ManualEntry
                      manualToken={manualToken}
                      setManualToken={setManualToken}
                      onSubmit={handleManualSubmit}
                      disabled={submitMut.isPending}
                    />
                  </div>
                  <Button variant="outline" className="mt-4" onClick={reset}>
                    Back
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info banner */}
        {scanState === 'idle' && (
          <Card className="mt-4">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-500" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-slate-700">How it works</p>
                <p className="mt-1 text-xs text-slate-500">
                  Your lecturer displays a rotating QR code during class. Scan it within the attendance window to mark yourself present.
                  The QR code refreshes every few seconds for security — always scan the latest one.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ManualEntry({
  manualToken,
  setManualToken,
  onSubmit,
  disabled,
}: {
  manualToken: string;
  setManualToken: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <Label className="text-xs text-slate-500">Or enter the token manually</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          placeholder="Paste QR token or session_id|token"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && onSubmit()}
        />
        <Button onClick={onSubmit} disabled={disabled || !manualToken.trim()}>
          Submit
        </Button>
      </div>
    </div>
  );
}
