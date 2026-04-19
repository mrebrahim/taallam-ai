const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidSdk35(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    
    // Force targetSdkVersion to 35
    gradle = gradle.replace(/targetSdkVersion\s+\d+/g, 'targetSdkVersion 35');
    gradle = gradle.replace(/compileSdkVersion\s+\d+/g, 'compileSdkVersion 35');
    gradle = gradle.replace(/targetSdk\s*=\s*\d+/g, 'targetSdk = 35');
    gradle = gradle.replace(/compileSdk\s*=\s*\d+/g, 'compileSdk = 35');
    
    config.modResults.contents = gradle;
    return config;
  });
};
