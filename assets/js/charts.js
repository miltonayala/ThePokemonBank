// Utilidades de formato (ES / USD)
const fmtCurrency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtNumber   = new Intl.NumberFormat('es-SV');

document.addEventListener('DOMContentLoaded', () => {
  // ====== DATA MOCK ======
  const labelsMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  const depositos = [520, 780, 640, 920, 860, 1040];  // USD
  const retiros   = [300, 450, 380, 610, 520, 720];   // USD

  const saldoInicial = 1500;
  const saldoMensual = labelsMes.map((_, i) => {
    const depAcum = depositos.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const retAcum = retiros.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return saldoInicial + depAcum - retAcum;
  });

  const tipos = ['Depósito', 'Retiro', 'Pago de servicios', 'Consulta de saldo'];
  const tiposCount = [42, 28, 15, 25];

  const servicios = ['Energía eléctrica', 'Internet', 'Telefonía', 'Agua'];
  const pagosServicios = [120, 85, 55, 70];

  window.MockData = {
    labelsMes, depositos, retiros, saldoInicial, saldoMensual,
    tipos, tiposCount,
    servicios, pagosServicios
  };


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
        { label: 'Retiros', data: retiros.map(v => -v), stack: 'montos' }
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
    data: { labels: labelsMes, datasets: [{ label: 'Saldo', data: saldoMensual, tension: 0.3, fill: false }] },
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
    data: { labels: servicios, datasets: [{ label: 'Total pagado', data: pagosServicios }] },
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
