import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.powerlift.fitness",
  appName: "PowerLift Fitness Gym",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: true,
  },
};

export default config;


