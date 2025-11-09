(function () {
  const { jsPDF } = window.jspdf;

  const fmtCurrency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const fmtNumber   = new Intl.NumberFormat('es-SV');
  const monthNames  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  function monthIdxToLabel(idx){ return monthNames[idx]; }
  function getMonthIndex(fechaStr){ const [, m] = String(fechaStr).split('-'); return Math.max(0, Math.min(11, parseInt(m,10)-1)); }
  function addToMap(map, key, value){ map.set(key, (map.get(key) || 0) + value); }
  function buildSeriesFromMap(monthMap){
    const months = Array.from(monthMap.keys()).sort((a,b)=>a-b);
    return {
      labels: months.map(m => monthIdxToLabel(m)),
      values: months.map(m => monthMap.get(m)),
      monthIndexes: months
    };
  }
  function classifyTx(tx){
    const code = String(tx["Código"] || '').toUpperCase();
    const shop = String(tx.Comercio || '').toUpperCase();
    const amount = Number(tx.Monto || 0);
    if (code.startsWith('CR'))  return 'Depósito';
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
  function detectServiceName(shop){
    const s = String(shop).toUpperCase();
    if (s.includes('LUZ')) return 'Energía eléctrica';
    if (s.includes('INTERNET')) return 'Internet';
    if (s.includes('TELÉFONO') || s.includes('TELEFONO')) return 'Telefonía';
    if (s.includes('AGUA')) return 'Agua';
    if (s.includes('MANUTENCION') || s.includes('MANUTENCIÓN')) return 'Manutención';
    return null;
  }

  function loadImageAsDataURL(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function addPageFooter(doc, textLeft = 'ThePokeBank — Reporte', textRight = '') {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const { width, height } = doc.internal.pageSize;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.setDrawColor(220);
      doc.line(40, height - 30, width - 40, height - 30);
      doc.text(textLeft, 40, height - 20);
      const right = textRight || `Página ${i} de ${pageCount}`;
      doc.text(right, width - 40, height - 20, { align: 'right' });
    }
  }

  async function prepareData() {
  const datosCliente = JSON.parse(localStorage.getItem('usuario') || '{}');
  const accountNumber = datosCliente?.cuenta ? String(datosCliente.cuenta) : null;

  // 1) Get txs either from injected AppCharts or from JSON fetch
  let txsSource = [];
  if (window.AppCharts && Array.isArray(window.AppCharts.txs) && window.AppCharts.txs.length) {
    txsSource = window.AppCharts.txs;
  } else {
    const JSON_URL = '/assets/json/transactions.json';
    try {
      const res = await fetch(JSON_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      txsSource = await res.json();
    } catch (e) {
      console.error('No se pudo cargar el JSON para PDF:', e);
      txsSource = [];
    }
  }

  // 2) Filter by account if we know it, then sort
  const txs = (accountNumber ? txsSource.filter(tx => String(tx.AccountNumber) === accountNumber) : txsSource.slice())
    .sort((a,b)=> String(a.Fecha).localeCompare(String(b.Fecha)));


    const monthDeposits = new Map();
    const monthWithdraw = new Map();
    const monthNet      = new Map();
    const typeCounts    = new Map();
    const serviceTotals = new Map();

    for (const tx of txs) {
      const mIdx = getMonthIndex(tx.Fecha);
      const amt  = Number(tx.Monto || 0);
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
      ...depSeries.monthIndexes, ...retSeries.monthIndexes, ...netSeries.monthIndexes
    ])).sort((a,b)=>a-b);

    const labelsMes  = allMonthIdx.map(monthIdxToLabel);
    const depositos  = allMonthIdx.map(m => monthDeposits.get(m) || 0);
    const retiros    = allMonthIdx.map(m => monthWithdraw.get(m) || 0);

    let acc = 0;
    const saldoMensual = allMonthIdx.map(m => { acc += (monthNet.get(m) || 0); return acc; });

    const tipos      = Array.from(typeCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([k])=>k);
    const tiposCount = Array.from(typeCounts.entries()).sort((a,b)=>b[1]-a[1]).map(([,v])=>v);

    const servicios      = Array.from(serviceTotals.keys());
    const pagosServicios = servicios.map(s => serviceTotals.get(s) || 0);

    return { txs, labelsMes, depositos, retiros, saldoMensual, tipos, tiposCount, servicios, pagosServicios };
  }

  async function generatePDF() {
    const AC = await prepareData();
    const {
      labelsMes = [], depositos = [], retiros = [], saldoMensual = [],
      tipos = [], tiposCount = [], servicios = [], pagosServicios = [], txs = []
    } = AC;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    let y = 50;

    // Logo
    const logo = await loadImageAsDataURL('assets/img/logo_pdf.png');
    if (logo) {
      const logoW = 120, logoH = 120;
      const pageW = doc.internal.pageSize.getWidth();
      doc.addImage(logo, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
      y += logoH + 10;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('Reporte de Transacciones', marginX, y); y += 22;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(`Fecha de generación de reporte: ${new Date().toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' })}`, marginX, y);
    y += 14;

    doc.setDrawColor(200);
    doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y); y += 14;

    const totalTx = tiposCount.reduce((a,b)=>a+b, 0);
    const bodyTipos = tipos.map((t, i) => {
      const n = tiposCount[i] ?? 0;
      const pct = totalTx ? (n * 100 / totalTx) : 0;
      return [t, fmtNumber.format(n), pct.toFixed(1) + '%'];
    });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Resumen por tipo de transacción', marginX, y); y += 6;

    doc.autoTable({
      startY: y + 10,
      head: [['Tipo', 'Cantidad', 'Porcentaje']],
      body: bodyTipos,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [220, 53, 69], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    y = doc.lastAutoTable.finalY + 20;

    const bodyMes = labelsMes.map((mes, i) => {
      const dep  = depositos[i] ?? 0;
      const ret  = retiros[i] ?? 0;
      const neto = dep - ret;
      const saldo = saldoMensual[i] ?? 0;
      return [mes, fmtCurrency.format(dep), fmtCurrency.format(ret), fmtCurrency.format(neto), fmtCurrency.format(saldo)];
    });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Montos por mes', marginX, y); y += 6;

    doc.autoTable({
      startY: y + 10,
      head: [['Mes', 'Depósitos', 'Retiros', 'Neto', 'Saldo acumulado']],
      body: bodyMes,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [220, 53, 69], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    y = doc.lastAutoTable.finalY + 20;

    const totalServicios = pagosServicios.reduce((a,b)=>a+b, 0);
    const bodyServ = servicios.map((s, i) => [s, fmtCurrency.format(pagosServicios[i] ?? 0)]);
    if (servicios.length) bodyServ.push(['Total', fmtCurrency.format(totalServicios)]);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Pagos por servicio', marginX, y); y += 6;

    doc.autoTable({
      startY: y + 10,
      head: [['Servicio', 'Total pagado']],
      body: bodyServ,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [220, 53, 69], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    y = doc.lastAutoTable.finalY + 20;

    addPageFooter(doc, 'ThePokeBank — Reporte');
    doc.save('reporte_pokemon_bank.pdf');
  }

  // document.addEventListener('DOMContentLoaded', () => {
  //   const btn = document.getElementById('btnDescargarPDF');
  //   if (btn) btn.addEventListener('click', generatePDF);
  // });

  window.generatePDF = generatePDF;

})();

function generarPDFTransaccion(datosCliente, monto, tipoTransaccion, extra = {}) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const fecha = new Date().toLocaleString("es-SV", {
        dateStyle: "long",
        timeStyle: "short"
    });

    const codigo = `${tipoTransaccion}-` + Math.floor(100000 + Math.random() * 900000);

    let tipoTexto = {
        ret: "Retiro",
        dep: "Depósito",
        pay: "Pago"
    }[tipoTransaccion] || "Transacción";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`ThePokeBank - Comprobante de ${tipoTexto}`, 40, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    doc.text(`Fecha: ${fecha}`, 40, 110);
    doc.text(`Cuenta: ${datosCliente.cuenta}`, 40, 140);
    doc.text(`Titular: ${datosCliente.nombre}`, 40, 170);

    doc.setDrawColor(200);
    doc.line(40, 200, 550, 200);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Detalle de la Transacción", 40, 230);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    doc.text(`Código de ${tipoTexto}: ${codigo}`, 40, 260);
    doc.text(`Monto de ${tipoTexto}: $${monto.toFixed(2)}`, 40, 290);

    if (tipoTransaccion === "pay") {
        const detalle = `${extra.categoria} - ${extra.empresa}`;
        doc.text(`Servicio pagado: ${detalle}`, 40, 320);
        doc.text(`Referencia: ${extra.referencia}`, 40, 350);
    }

    doc.text(`Saldo final: $${datosCliente.saldo.toFixed(2)}`, 40, tipoTransaccion === "pay" ? 380 : 320);

    doc.setDrawColor(200);
    doc.line(40, tipoTransaccion === "pay" ? 410 : 350, 550, tipoTransaccion === "pay" ? 410 : 350);

    doc.setFontSize(10);
    doc.text("Gracias por usar nuestros servicios.", 40, tipoTransaccion === "pay" ? 440 : 380);
    doc.text("ThePokeBank © 2025", 40, tipoTransaccion === "pay" ? 460 : 400);

    doc.save(`comprobante_${tipoTexto}_${codigo}.pdf`);
}

