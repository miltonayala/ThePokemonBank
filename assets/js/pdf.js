(function () {
  const { jsPDF } = window.jspdf;

  const fmtCurrency = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const fmtNumber   = new Intl.NumberFormat('es-SV');

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
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function addPageFooter(doc, textLeft = 'Pokémon Bank — Reporte', textRight = '') {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const { width, height } = doc.internal.pageSize;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(textLeft, 40, height - 20);
      const right = textRight || `Página ${i} de ${pageCount}`;
      doc.text(right, width - 40, height - 20, { align: 'right' });
      doc.setDrawColor(220);
      doc.line(40, height - 30, width - 40, height - 30);
    }
  }

  async function generatePDF() {
    const data = window.MockData || {};
    const {
      labelsMes = [], depositos = [], retiros = [], saldoInicial = 0, saldoMensual = [],
      tipos = [], tiposCount = [],
      servicios = [], pagosServicios = []
    } = data;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    let cursorY = 50;

    const logo = await loadImageAsDataURL('assets/img/logo_pdf.png'); 
    if (logo) {
      const logoW = 120, logoH = 120;
      const pageW = doc.internal.pageSize.getWidth();
      doc.addImage(logo, 'PNG', (pageW - logoW) / 2, cursorY, logoW, logoH);
      cursorY += logoH + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Reporte de Transacciones', marginX, cursorY);
    cursorY += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const fecha = new Date();
    const fechaTxt = fecha.toLocaleString('es-SV', { dateStyle: 'long', timeStyle: 'short' });
    doc.text(`Fecha de generación de Reporte: ${fechaTxt}`, marginX, cursorY);
    cursorY += 14;

    doc.setDrawColor(200);
    doc.line(marginX, cursorY, doc.internal.pageSize.getWidth() - marginX, cursorY);
    cursorY += 14;

    const totalTx = tiposCount.reduce((a,b)=>a+b, 0);
    const bodyTipos = tipos.map((t, i) => {
      const n = tiposCount[i] ?? 0;
      const pct = totalTx ? (n * 100 / totalTx) : 0;
      return [t, fmtNumber.format(n), pct.toFixed(1) + '%'];
    });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Resumen por tipo de transacción', marginX, cursorY);
    cursorY += 6;

    doc.autoTable({
      startY: cursorY + 10,
      head: [['Tipo', 'Cantidad', 'Porcentaje']],
      body: bodyTipos,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [0, 123, 255], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    const bodyMes = labelsMes.map((mes, i) => {
      const dep = depositos[i] ?? 0;
      const ret = retiros[i] ?? 0;
      const neto = dep - ret;
      const saldo = saldoMensual[i] ?? 0;
      return [mes, fmtCurrency.format(dep), fmtCurrency.format(ret), fmtCurrency.format(neto), fmtCurrency.format(saldo)];
    });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Montos por mes', marginX, cursorY);
    cursorY += 6;

    doc.autoTable({
      startY: cursorY + 10,
      head: [['Mes', 'Depósitos', 'Retiros', 'Neto', 'Saldo acumulado']],
      body: bodyMes,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [23, 162, 184], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    cursorY = doc.lastAutoTable.finalY + 20;

    const totalServicios = pagosServicios.reduce((a,b)=>a+b, 0);
    const bodyServ = servicios.map((s, i) => [s, fmtCurrency.format(pagosServicios[i] ?? 0)]);
    bodyServ.push(['Total', fmtCurrency.format(totalServicios)]);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Pagos por servicio', marginX, cursorY);
    cursorY += 6;

    doc.autoTable({
      startY: cursorY + 10,
      head: [['Servicio', 'Total pagado']],
      body: bodyServ,
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [40, 167, 69], textColor: 255 },
      margin: { left: marginX, right: marginX }
    });
    cursorY = doc.lastAutoTable.finalY + 24;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100);

    addPageFooter(doc, 'Control de gastos - Reporte', '');

    doc.save('reporte_pokemon_bank.pdf');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnDescargarPDF');
    if (btn) btn.addEventListener('click', generatePDF);
  });
})();
