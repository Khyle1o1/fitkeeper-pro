# QR Scanner Testing Guide

## Overview
This guide will help you test the QR scanner functionality in both web and APK builds after the recent improvements.

## Changes Made

### 1. Android Manifest Updates
- Added `FLASHLIGHT` permission for torch functionality
- Added `android.hardware.camera.flash` feature declaration
- Maintained existing camera permissions and features

### 2. QRScanner Component Improvements
- Enhanced platform detection with proper native scanner initialization
- Improved error handling with specific error messages
- Added loading states and better user feedback
- Enhanced permission checking for both web and native platforms
- Better cleanup and resource management

### 3. CSS Styles for Native Scanner
- Added styles to ensure native camera view is visible
- Proper overlay handling for native scanner mode

## Testing Steps

### Web Testing
1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test QR Scanner:**
   - Navigate to the Attendance page
   - Click the "Scan" button next to the Member ID input
   - Verify the scanner dialog opens
   - Test with a QR code (should work with web camera)

### APK Testing

#### Build the APK
1. **Build the web app:**
   ```bash
   npm run build
   ```

2. **Sync with Capacitor:**
   ```bash
   npm run cap:copy
   ```

3. **Open Android Studio:**
   ```bash
   npm run cap:android
   ```

4. **Build APK in Android Studio:**
   - In Android Studio, go to `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
   - Or use the command line: `./gradlew assembleDebug` (from android directory)

#### Test on Device
1. **Install the APK on your Android device**
2. **Grant camera permissions when prompted**
3. **Test QR Scanner:**
   - Open the app
   - Navigate to Attendance page
   - Click "Scan" button
   - Verify native camera scanner opens
   - Test scanning a QR code

## Expected Behavior

### Web Version
- Uses `qr-scanner` library with web camera
- Shows video preview in dialog
- Supports QR codes
- Requires camera permission

### APK Version
- Uses `@capacitor-community/barcode-scanner` native plugin
- Opens full-screen native camera scanner
- Supports multiple formats: QR Code, Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E
- Has torch/flashlight and camera flip buttons
- Provides haptic feedback and beep on successful scan

## Troubleshooting

### Common Issues

1. **"Failed to start QR scanner" error:**
   - Check camera permissions in device settings
   - Ensure camera is not being used by another app
   - Try restarting the app

2. **Scanner doesn't open on APK:**
   - Verify `@capacitor-community/barcode-scanner` is properly installed
   - Check Android manifest permissions
   - Ensure device has a camera

3. **Permission denied:**
   - Go to device Settings → Apps → [Your App] → Permissions
   - Enable Camera permission
   - Restart the app

4. **Web scanner not working:**
   - Check browser camera permissions
   - Try using HTTPS (required for camera access)
   - Test in different browsers

### Debug Information
- Check browser console for web errors
- Check Android logcat for native errors
- Verify plugin installation: `npm list @capacitor-community/barcode-scanner`

## Success Criteria
- ✅ Web scanner works in browser
- ✅ APK scanner opens native camera
- ✅ Both can scan QR codes successfully
- ✅ Proper error handling and user feedback
- ✅ Camera permissions handled correctly
- ✅ Scanner works offline in APK

## Additional Notes
- The scanner now provides better error messages
- Loading states improve user experience
- Native scanner has more features (torch, camera flip, multiple formats)
- Proper cleanup prevents memory leaks
- Fallback mechanisms for better reliability
