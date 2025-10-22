import { Preferences } from '@capacitor/preferences';
import { hashPassword } from './auth';

// Master activation code - in production, this should be more secure
// You can also fetch this from a remote server or use environment variables
const MASTER_ACTIVATION_CODE = 'Angelofgodproduction@2025';

// Storage keys
const ACTIVATION_KEY = 'fk:isActivated';
const DEVICE_ID_KEY = 'fk:deviceId';

/**
 * Generate a unique device ID
 */
export const generateDeviceId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
};

/**
 * Get or create device ID
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    const { value } = await Preferences.get({ key: DEVICE_ID_KEY });
    if (value) {
      return value;
    }
    
    // Generate new device ID if none exists
    const deviceId = generateDeviceId();
    await Preferences.set({ key: DEVICE_ID_KEY, value: deviceId });
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a simple device ID
    return generateDeviceId();
  }
};

/**
 * Check if the app is activated
 */
export const isAppActivated = async (): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key: ACTIVATION_KEY });
    return value === 'true';
  } catch (error) {
    console.error('Error checking activation status:', error);
    return false;
  }
};

/**
 * Activate the app with the provided code
 */
export const activateApp = async (code: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Hash the provided code for comparison
    const hashedCode = await hashPassword(code);
    const hashedMasterCode = await hashPassword(MASTER_ACTIVATION_CODE);
    
    if (hashedCode === hashedMasterCode) {
      // Get device ID for additional security
      const deviceId = await getDeviceId();
      
      // Store activation status with device ID
      await Preferences.set({ 
        key: ACTIVATION_KEY, 
        value: 'true' 
      });
      
      // Store device ID for verification
      await Preferences.set({ 
        key: 'fk:activationDeviceId', 
        value: deviceId 
      });
      
      return {
        success: true,
        message: 'App activated successfully!'
      };
    } else {
      return {
        success: false,
        message: 'Invalid activation code. Please check and try again.'
      };
    }
  } catch (error) {
    console.error('Error during activation:', error);
    return {
      success: false,
      message: 'An error occurred during activation. Please try again.'
    };
  }
};

/**
 * Reset activation (for testing or manual reset)
 */
export const resetActivation = async (): Promise<void> => {
  try {
    await Preferences.remove({ key: ACTIVATION_KEY });
    await Preferences.remove({ key: 'fk:activationDeviceId' });
  } catch (error) {
    console.error('Error resetting activation:', error);
  }
};

/**
 * Verify activation is still valid (checks device ID)
 */
export const verifyActivation = async (): Promise<boolean> => {
  try {
    const isActivated = await isAppActivated();
    if (!isActivated) {
      return false;
    }
    
    // Check if device ID matches (optional security enhancement)
    const currentDeviceId = await getDeviceId();
    const { value: storedDeviceId } = await Preferences.get({ key: 'fk:activationDeviceId' });
    
    // If no stored device ID, consider it valid (for backward compatibility)
    if (!storedDeviceId) {
      return true;
    }
    
    return currentDeviceId === storedDeviceId;
  } catch (error) {
    console.error('Error verifying activation:', error);
    return false;
  }
};
