const tls = require('node:tls');

function trustSystemCa() {
  if (global.__trustedSystemCa) return;
  if (typeof tls.setDefaultCACertificates !== 'function') return;
  try {
    tls.setDefaultCACertificates([
      ...tls.getCACertificates('default'),
      ...tls.getCACertificates('system'),
    ]);
    global.__trustedSystemCa = true;
  } catch (err) {
    console.warn('[TLS] Không nạp được chứng chỉ hệ thống:', err.message);
  }
}

module.exports = { trustSystemCa };
