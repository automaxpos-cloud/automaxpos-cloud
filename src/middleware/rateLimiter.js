const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 60, keyGenerator } = {}) {
  return (req, res, next) => {
    const keyBase = keyGenerator ? keyGenerator(req) : `${req.ip || "unknown"}:${req.path}`;
    const now = Date.now();
    const entry = buckets.get(keyBase);
    if (!entry || now > entry.resetAt) {
      buckets.set(keyBase, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ ok: false, error: "RATE_LIMITED", message: "Too many requests" });
    }
    return next();
  };
}

module.exports = { rateLimit };
