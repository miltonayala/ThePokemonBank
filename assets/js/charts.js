const fmtCurrency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtNumber   = new Intl.NumberFormat('es-SV');

const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const monthIdxToLabel = (idx) => monthNames[idx]; 

function classifyTx(tx) {
  const code = String(tx["Código"] || '').toUpperCase();
  const shop = String(tx.Comercio || '').toUpperCase();
  const amount = Number(tx.Monto || 0);

  if (code.startsWith('CR')) return 'Depósito';
  if (code.startsWith('RET')) return 'Retiro';
  if (code.startsWith('PAY')) return 'Pago de servicios';
  if (code.startsWith('SUB')) return 'Suscripción';

  if (shop.includes('DEPOSITO') || shop.includes('DEPÓSITO')) return 'Depósito';
  if (shop.includes('RETIRO')) return 'Retiro';
  if (shop.startsWith('PAGO ')) return 'Pago de servicios';
  if (shop.includes('APPLE MUSIC') || shop.includes('SPOTIFY') || shop.includes('NETFLIX')) return 'Suscripción';

  if (amount > 0) return 'Depósito';
  if (amount < 0) return 'Retiro';

  return 'Otros';
}

function getMonthIndex(fechaStr) {
  const [y, m] = String(fechaStr).split('-');
  return Math.max(0, Math.min(11, parseInt(m, 10) - 1));
}

function addToMap(map, key, value) {
  map.set(key, (map.get(key) || 0) + value);
}

function buildSeriesFromMap(monthMap) {
  const months = Array.from(monthMap.keys()).sort((a,b)=>a-b);
  const labels = months.map(m => monthIdxToLabel(m));
  const values = months.map(m => monthMap.get(m));
  return { labels, values, monthIndexes: months };
}

function detectServiceName(shop) {
  const s = String(shop).toUpperCase();
  if (s.includes('LUZ'))       return 'Energía eléctrica';
  if (s.includes('INTERNET'))  return 'Internet';
  if (s.includes('TELÉFONO') || s.includes('TELEFONO')) return 'Telefonía';
  if (s.includes('AGUA'))      return 'Agua';
  if (s.includes('MANUTENCION') || s.includes('MANUTENCIÓN')) return 'Manutención';
  return null; // otros servicios no mapeados
}

document.addEventListener('DOMContentLoaded', async () => {

  const JSON_URL = '/assets/json/transactions.json';

  const datosCliente = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (!datosCliente || !datosCliente.login || !datosCliente.cuenta) {

    console.warn('No hay usuario logueado en localStorage.usuario; se mostrarán todas las transacciones.');
  }

  let data = [];
  try {
    const res = await fetch(JSON_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error('No se pudo cargar el JSON:', e);
    data = [];
  }

  const accountNumber = datosCliente?.cuenta ? String(datosCliente.cuenta) : null;
  const txs = accountNumber
    ? data.filter(tx => String(tx.AccountNumber) === accountNumber)
    : data.slice();

  txs.sort((a,b)=> String(a.Fecha).localeCompare(String(b.Fecha)));

  const monthDeposits = new Map();
  const monthWithdraw = new Map();
  const typeCounts    = new Map();
  const serviceTotals = new Map();

  const monthNet = new Map();

  for (const tx of txs) {
    const mIdx = getMonthIndex(tx.Fecha);
    const amt = Number(tx.Monto || 0);
    const tipo = classifyTx(tx);

    addToMap(typeCounts, tipo, 1);

    if (amt > 0) addToMap(monthDeposits, mIdx, amt);
    if (amt < 0) addToMap(monthWithdraw, mIdx, Math.abs(amt));

    addToMap(monthNet, mIdx, amt);

    const svc = detectServiceName(tx.Comercio);
    if (svc && amt < 0) addToMap(serviceTotals, svc, Math.abs(amt));
  }

  const depSeries = buildSeriesFromMap(monthDeposits);
  const retSeries = buildSeriesFromMap(monthWithdraw);
  const netSeries = buildSeriesFromMap(monthNet);


  const allMonthIdx = Array.from(new Set([
    ...depSeries.monthIndexes,
    ...retSeries.monthIndexes,
    ...netSeries.monthIndexes
  ])).sort((a,b)=>a-b);

  const labelsMes = allMonthIdx.map(monthIdxToLabel);

  const depositos = allMonthIdx.map(m => monthDeposits.get(m) || 0);
  const retiros   = allMonthIdx.map(m => monthWithdraw.get(m) || 0);

  const netosOrdenados = allMonthIdx.map(m => monthNet.get(m) || 0);
  const saldoMensual = [];
  let acc = 0;
  for (const n of netosOrdenados) {
    acc += n;
    saldoMensual.push(acc);
  }

  const tipos = Array.from(typeCounts.entries())
    .sort((a,b)=>b[1]-a[1])
    .map(([k])=>k);
  const tiposCount = Array.from(typeCounts.entries())
    .sort((a,b)=>b[1]-a[1])
    .map(([,v])=>v);

  const servicios = Array.from(serviceTotals.keys());
  const pagosServicios = servicios.map(s => serviceTotals.get(s) || 0);

  new Chart(document.getElementById('txTipoChart'), {
    type: 'doughnut',
    data: { labels: tipos, datasets: [{ data: tiposCount }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const val = ctx.parsed;
              const pct = total ? ((val / total) * 100) : 0;
              return `${ctx.label}: ${fmtNumber.format(val)} (${pct.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });

  new Chart(document.getElementById('montosMensualesChart'), {
    type: 'bar',
    data: {
      labels: labelsMes,
      datasets: [
        { label: 'Depósitos', data: depositos, stack: 'montos' },
        { label: 'Retiros',   data: retiros.map(v => -v), stack: 'montos' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          grid: { drawBorder: false },
          ticks: { callback: (v) => fmtCurrency.format(Math.abs(v)) }
        }
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency.format(Math.abs(ctx.parsed.y))}`
          }
        }
      }
    }
  });

  new Chart(document.getElementById('saldoTiempoChart'), {
    type: 'line',
    data: {
      labels: labelsMes,
      datasets: [{
        label: 'Saldo acumulado (relativo)',
        data: saldoMensual,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => `Saldo: ${fmtCurrency.format(ctx.parsed.y)}` } }
      },
      scales: {
        y: { ticks: { callback: (v) => fmtCurrency.format(v) }, grid: { drawBorder: false } },
        x: { grid: { display: false } }
      }
    }
  });

  new Chart(document.getElementById('pagosServicioChart'), {
    type: 'bar',
    data: {
      labels: servicios,
      datasets: [{ label: 'Total pagado', data: pagosServicios }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency.format(ctx.parsed.x)}` } }
      },
      scales: {
        x: { ticks: { callback: (v) => fmtCurrency.format(v) }, grid: { drawBorder: false } },
        y: { grid: { display: false } }
      }
    }
  });
});
