import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.powerlift.fitness',
  appName: 'PowerLift Fitness Gym',
  webDir: 'dist',
  plugins: {
    BarcodeScanner: {
      // Enable camera permission request
      cameraPermission: true,
      // Enable microphone permission (not needed for barcode scanning but some devices require it)
      microphonePermission: false,
    }
  }
};

export default config;
