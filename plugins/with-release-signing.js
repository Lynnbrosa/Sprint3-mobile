const { withAppBuildGradle } = require('expo/config-plugins');

// o template do RN assina o release com a debug.keystore. aqui o release passa a usar
// a upload key quando as PREVIOPLS_UPLOAD_* existem no ~/.gradle/gradle.properties
// (nunca no repo). sem elas o build continua saindo, assinado com a chave de debug.
const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('PREVIOPLS_UPLOAD_STORE_FILE')) {
                storeFile file(PREVIOPLS_UPLOAD_STORE_FILE)
                storePassword PREVIOPLS_UPLOAD_STORE_PASSWORD
                keyAlias PREVIOPLS_UPLOAD_KEY_ALIAS
                keyPassword PREVIOPLS_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('PREVIOPLS_UPLOAD_STORE_FILE')) return cfg;

    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => m + RELEASE_SIGNING);
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('PREVIOPLS_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
