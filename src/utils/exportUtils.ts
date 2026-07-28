export const exportToCSV = (data: any[], filename: string, columns: { key: string, label: string }[]) => {
  // Add BOM for Excel UTF-8 support
  let csvContent = '\uFEFF';
  
  // Headers
  csvContent += columns.map(c => c.label).join(',') + '\n';
  
  // Data rows
  data.forEach(row => {
    const rowStr = columns.map(c => {
      let val = row[c.key] ?? '';
      val = String(val).replace(/"/g, '""'); // escape quotes
      return `"${val}"`;
    }).join(',');
    csvContent += rowStr + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printData = (title: string, data: any[], columns: { key: string, label: string }[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
          body { 
            font-family: 'Cairo', sans-serif; 
            padding: 40px; 
            background-color: white;
            color: #1a1a1a;
          }
          h1 { 
            text-align: center; 
            color: #1e293b; 
            margin-bottom: 30px;
            font-size: 24px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
          }
          th, td { 
            border: 1px solid #cbd5e1; 
            padding: 12px 8px; 
            text-align: right; 
            font-size: 14px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #334155; 
            font-weight: 700;
          }
          tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; margin: 0; background: #fff; zoom: 88%; }
            button { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            @page { margin: 10mm; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              ${columns.map(c => `<th>${c.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(c => `<td ${c.key === 'phone' ? 'dir="ltr" style="text-align: left;"' : ''}>${row[c.key] ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          تمت الطباعة بواسطة نظام فواتير | ${new Date().toLocaleDateString('ar-EG')}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500); // Wait for fonts to load
          };
        </script>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
};

export const safePrint = () => {
  try {
    if (typeof window !== 'undefined') {
      window.focus();
      setTimeout(() => {
        window.print();
      }, 100);
    }
  } catch (err) {
    console.error("Print failed", err);
    alert("عذراً، تعذر تشغيل أمر الطباعة المباشر. يرجى فتح التطبيق في نافذة مستقلة للطباعة.");
  }
};

