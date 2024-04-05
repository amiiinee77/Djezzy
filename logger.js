function logger(req, res, next) {
  const timestamp = new Date().toLocaleTimeString();
  const apiName = req.originalUrl;
  const staticAssetExtensions = [".css", ".js", ".jpg", ".png", ".gif", ".ico"];
  const isStaticAsset = staticAssetExtensions.some((ext) => apiName.endsWith(ext));

  if (!isStaticAsset) {
    console.log("");
    console.log(`\x1b[33m ${timestamp} \x1b[90m Calling API : \x1b[36m ${apiName} \x1b[0m`);
  }

  next();
}

module.exports = logger;
