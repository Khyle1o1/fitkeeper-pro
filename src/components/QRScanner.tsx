import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorBarcodeScanner } from '@capacitor/barcode-scanner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, AlertCircle, Smartphone, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

const QRScanner = ({ isOpen, onClose, onScan }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      checkPlatform();
    } else {
      stopScanning();
    }
  }, [isOpen]);

  const checkPlatform = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      
      console.log('🔍 Checking platform...');
      
      // Check if we're running in a native Capacitor app
      const isNativePlatform = Capacitor.isNativePlatform();
      console.log('📱 Is native platform:', isNativePlatform);
      setIsNative(isNativePlatform);

      if (isNativePlatform) {
        console.log('🤖 Native platform detected, checking scanner...');
        try {
          // For native apps, check if barcode scanner plugin is available
          await checkNativeScanner();
        } catch (nativeError) {
          console.warn('⚠️ Native scanner failed, falling back to web scanner:', nativeError);
          // Fallback to web scanner if native fails
          setIsNative(false);
          await checkWebPermissions();
        }
      } else {
        console.log('🌐 Web platform detected, checking permissions...');
        // For web browsers, check camera permissions
        await checkWebPermissions();
      }
      
      console.log('✅ Platform check completed successfully');
      setScannerReady(true);
    } catch (err: any) {
      console.error('❌ Platform check error:', err);
      const errorMessage = err?.message || 'Unknown error';
      setError(`Failed to initialize scanner: ${errorMessage}`);
      
      // Show more specific error in toast
      toast({
        title: 'Scanner Initialization Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const checkNativeScanner = async () => {
    try {
      console.log('📦 Checking barcode scanner plugin...');
      console.log('📱 CapacitorBarcodeScanner object:', CapacitorBarcodeScanner);
      
      if (!CapacitorBarcodeScanner) {
        throw new Error('CapacitorBarcodeScanner object is undefined');
      }
      
      if (typeof CapacitorBarcodeScanner.scanBarcode !== 'function') {
        throw new Error('scanBarcode method is not available');
      }
      
      console.log('✅ Barcode scanner plugin available');
      console.log('🔐 Checking camera permissions...');
      
      // For the new plugin, we'll test by trying to scan with a simple test
      // If it fails due to permissions, we'll handle it in the scanning function
      setHasPermission(true); // Assume permission is available, will be checked during scan
      
      console.log('✅ Native scanner check completed successfully');
    } catch (err: any) {
      console.error('❌ Native scanner check error:', err);
      const errorMessage = err?.message || 'Unknown error';
      throw new Error(`Native scanner unavailable: ${errorMessage}`);
    }
  };

  const checkWebPermissions = async () => {
    try {
      console.log('🌐 Checking web camera permissions...');
      
      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(device => device.kind === 'videoinput');
      console.log('📷 Camera available:', hasCamera);
      
      if (!hasCamera) {
        throw new Error('No camera found on this device');
      }

      // Try to get camera permission
      console.log('🔐 Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      console.log('✅ Camera permission granted');
      setHasPermission(true);
    } catch (err: any) {
      console.error('❌ Camera permission error:', err);
      const errorMessage = err?.message || 'Camera permission is required to scan QR codes';
      setError(errorMessage);
      setHasPermission(false);
      throw new Error(errorMessage);
    }
  };

  const startNativeScanning = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      console.log('🚀 Starting native barcode scan...');
      console.log('📱 CapacitorBarcodeScanner object:', CapacitorBarcodeScanner);
      
      if (!CapacitorBarcodeScanner) {
        throw new Error('CapacitorBarcodeScanner object is undefined');
      }
      
      if (typeof CapacitorBarcodeScanner.scanBarcode !== 'function') {
        throw new Error('scanBarcode method is not available');
      }
      
      // Start scanning with the new plugin API
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: 'QR_CODE', // Focus on QR codes, but can scan others too
        scanInstructions: 'Point your camera at a QR code',
        scanButton: true,
        scanText: 'Scan QR Code',
        cameraDirection: 'BACK',
        scanOrientation: 'ADAPTIVE',
        android: {
          scanningLibrary: 'ZXING' // Use ZXING for better format support
        },
        web: {
          showCameraSelection: true,
          scannerFPS: 5
        }
      });
      
      console.log('📱 Scan result:', result);
      
      if (result && result.ScanResult) {
        onScan(result.ScanResult);
        onClose();
      }
    } catch (err: any) {
      console.error('Native QR Scanner error:', err);
      const message = err?.message || err?.toString() || 'Unknown error';
      
      // Provide more specific error messages
      if (message.includes('permission')) {
        setError('Camera permission is required. Please enable camera access in your device settings.');
      } else if (message.includes('not supported') || message.includes('not available')) {
        setError('QR scanner is not supported on this device. Please use manual entry instead.');
      } else if (message.includes('camera')) {
        setError('Camera is not available or in use by another app. Please try again.');
      } else if (message.includes('undefined')) {
        setError('Barcode scanner plugin is not properly installed or registered.');
      } else {
        setError(`Scanner error: ${message}`);
      }
      
      toast({
        title: 'Scanner Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const startWebScanning = async () => {
    try {
      setIsScanning(true);
      setError(null);
      
      if (!hasPermission) {
        await checkWebPermissions();
        if (!hasPermission) {
          setIsScanning(false);
          return;
        }
      }

      // Import QRScanner dynamically
      const QrScanner = (await import('qr-scanner')).default;
      
      if (videoRef.current) {
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result: any) => {
            onScan(result.data);
            stopScanning();
            onClose();
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment', // Use back camera if available
            maxScansPerSecond: 5,
          }
        );
        
        await qrScannerRef.current.start();
      }
    } catch (err: any) {
      console.error('Web QR Scanner error:', err);
      const message = err?.message || 'Failed to start QR scanner';
      setError(`${message}. Please try again or enter the Member ID manually.`);
      
      toast({
        title: 'Scanner Error',
        description: message,
        variant: 'destructive',
      });
      
      setIsScanning(false);
    }
  };

  const startScanning = async () => {
    if (!scannerReady) {
      setError('Scanner is not ready yet. Please wait...');
      return;
    }

    if (isNative) {
      await startNativeScanning();
    } else {
      await startWebScanning();
    }
  };

  const stopScanning = async () => {
    try {
      if (isNative) {
        // For native apps, the new scanner handles its own cleanup automatically
        console.log('🛑 Native scanner cleanup handled automatically');
      } else {
        // For web scanners
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          qrScannerRef.current = null;
        }
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isNative ? <Smartphone className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            QR Code Scanner
            {isNative && <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Mobile</span>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Initializing Scanner...</p>
                <p className="text-sm text-muted-foreground">
                  Checking platform and permissions
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Scanner Error</p>
                <p className="text-sm text-destructive/80">{error}</p>
                {error.includes('permission') && (
                  <p className="text-xs text-destructive/60 mt-1">
                    Please enable camera access in your device settings and try again.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isScanning && !isNative ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-4 border-primary border-dashed rounded-lg animate-pulse opacity-50"></div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-white font-medium bg-black/50 rounded px-2 py-1">
                      Point camera at QR code
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  {isNative ? (
                    <Smartphone className="h-16 w-16 text-primary" />
                  ) : (
                    <Camera className="h-16 w-16 text-muted-foreground" />
                  )}
                  <div className="text-center">
                    <p className="font-medium">
                      {isNative ? 'Native QR Scanner Ready' : 'Web QR Scanner Ready'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isNative 
                        ? 'Click "Start Scanning" to open native camera scanner'
                        : 'Click "Start Scanning" to begin web camera scanning'
                      }
                    </p>
                    {hasPermission === false && (
                      <p className="text-xs text-destructive mt-2">
                        Camera permission required
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={startScanning}
              disabled={isScanning || hasPermission === false || isInitializing || !scannerReady}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Scanning...
                </>
              ) : isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Initializing...
                </>
              ) : (
                'Start Scanning'
              )}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Debug Information */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Platform:</strong> {isNative ? 'Native (APK)' : 'Web'}</p>
            <p><strong>Scanner Ready:</strong> {scannerReady ? 'Yes' : 'No'}</p>
            <p><strong>Permission:</strong> {hasPermission === null ? 'Checking...' : hasPermission ? 'Granted' : 'Denied'}</p>
            <p><strong>Initializing:</strong> {isInitializing ? 'Yes' : 'No'}</p>
            {error && <p className="text-destructive"><strong>Error:</strong> {error}</p>}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              {isNative 
                ? 'Supported formats: QR Code, Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, Data Matrix, PDF417, Aztec, Codabar, ITF, RSS-14, RSS-Expanded'
                : 'Supported formats: QR Code'
              }
            </p>
            <p>Make sure the code is well-lit and clearly visible</p>
            {isNative && (
              <p className="text-primary font-medium mt-2">
                📱 Using official Capacitor barcode scanner with ZXING library
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;

