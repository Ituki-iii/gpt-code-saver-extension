const { createConfig } = require("./playwright.shared");

module.exports = createConfig({
  grep: /@benchmark/,
  reporter: [["list"]],
});
