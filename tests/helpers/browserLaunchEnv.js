const path = require("path");

function getBrowserLaunchEnv() {
  const localLibPath = path.join(__dirname, "..", ".local-libs", "usr", "lib", "x86_64-linux-gnu");
  const existingLibraryPath = process.env.LD_LIBRARY_PATH || "";
  return {
    ...process.env,
    LD_LIBRARY_PATH: existingLibraryPath
      ? `${localLibPath}:${existingLibraryPath}`
      : localLibPath,
    FONTCONFIG_PATH: "/etc/fonts",
    FONTCONFIG_FILE: path.join(__dirname, "..", "config", "fontconfig-windows-ja.conf"),
  };
}

module.exports = {
  getBrowserLaunchEnv,
};
