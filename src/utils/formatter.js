function formatCNStatus(cnValue) {
  const value = parseFloat(cnValue);
  if (isNaN(value)) return '❌ Tidak terdeteksi';
  return `${value.toFixed(2)} dB (${value >= 40 ? 'OK' : 'NOK'})`;
}

function formatCPIStatus(cpiValue, siteId) {
  const value = parseFloat(cpiValue);
  if (isNaN(value)) return '❌ Tidak terdeteksi';

  const upperId = siteId.toUpperCase();
  const isException = upperId.startsWith('PAP') || upperId.startsWith('MLU') || upperId.startsWith('MLA');
  const threshold = isException ? 33 : 30;

  return `${value.toFixed(2)} dB (${value >= threshold ? 'OK' : 'NOK'})`;
}

module.exports = {
  formatCNStatus,
  formatCPIStatus
};
