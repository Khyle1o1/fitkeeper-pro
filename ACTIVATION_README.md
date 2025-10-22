# FitKeeper Pro - Activation System

## Overview
The FitKeeper Pro app now includes a one-time security code activation system that must be completed before the app can be used.

## How It Works

### First Launch
1. When the app is first opened, users will see an activation screen
2. They must enter the activation code: `FITKEEPER2024`
3. Once the correct code is entered, the app is marked as "activated" using secure storage
4. The user is then redirected to the login screen

### Subsequent Launches
- The app checks if it's already activated
- If activated, users go directly to the login screen (or main app if already logged in)
- If not activated, users see the activation screen again

## Security Features

### Secure Storage
- Uses Capacitor Preferences for secure storage (not localStorage)
- Activation status is stored securely on the device
- Cannot be easily tampered with by users

### Device Binding (Optional)
- Each device gets a unique device ID
- Activation is tied to the specific device
- Prevents one activation code from working on multiple devices

### Code Hashing
- The activation code is hashed using SHA-256 before comparison
- The master code is also hashed for secure comparison
- Prevents easy reverse engineering

## Master Activation Code
**Current Code:** `FITKEEPER2024`

⚠️ **Important:** Change this code in production by modifying the `MASTER_ACTIVATION_CODE` constant in `src/lib/activation.ts`

## Admin Features

### Reset Activation
Administrators can reset the activation status from the Settings page:
1. Go to Settings → App Activation section
2. Click "Reset Activation" button
3. Confirm the action
4. The app will require activation again on next launch

## Technical Implementation

### Files Modified/Created
- `src/lib/activation.ts` - Core activation logic and secure storage
- `src/pages/ActivationPage.tsx` - Activation screen UI
- `src/App.tsx` - Updated routing to check activation status
- `src/pages/Settings.tsx` - Added activation management section

### Dependencies Added
- `@capacitor/preferences` - For secure storage

### Storage Keys Used
- `fk:isActivated` - Boolean flag for activation status
- `fk:deviceId` - Unique device identifier
- `fk:activationDeviceId` - Device ID used during activation

## Testing

### Test Activation Flow
1. Clear app data or use a fresh installation
2. Launch the app - should show activation screen
3. Enter `FITKEEPER2024` - should activate successfully
4. Restart app - should skip activation and go to login
5. Test reset from Settings - should require activation again

### Test Invalid Code
1. Enter wrong code - should show error message
2. Try again with correct code - should work

## Production Considerations

### Security Enhancements
1. **Change Master Code**: Update `MASTER_ACTIVATION_CODE` in `src/lib/activation.ts`
2. **Remote Validation**: Consider fetching activation codes from a remote server
3. **Code Encryption**: Encrypt the master code in the app build
4. **Time-based Codes**: Implement time-limited activation codes
5. **User-specific Codes**: Generate different codes for different users/organizations

### Distribution Control
- Each organization can have their own activation code
- Codes can be tied to specific device types or regions
- Implement code expiration for better control

## Troubleshooting

### Common Issues
1. **Activation not persisting**: Check if Capacitor Preferences is properly synced
2. **Code not working**: Verify the master code matches exactly (case-sensitive)
3. **Reset not working**: Ensure the reset function has proper permissions

### Debug Information
- Check browser console for activation-related errors
- Verify secure storage keys in browser dev tools (Application → Storage)
- Test on both web and native platforms

## Future Enhancements

### Planned Features
1. **QR Code Activation**: Allow activation via QR code scanning
2. **Network Validation**: Validate activation against remote server
3. **Multi-device Management**: Allow one code to activate multiple devices
4. **Activation Analytics**: Track activation attempts and success rates
5. **Automatic Updates**: Push new activation codes without app updates
