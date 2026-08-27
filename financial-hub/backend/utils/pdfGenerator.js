const puppeteer = require('puppeteer');

class PDFGenerator {
  static async generatePDF(html, options = {}) {
    if (process.env.DISABLE_PDF_GENERATION === 'true') {
      throw new Error('PDF generation is disabled (DISABLE_PDF_GENERATION=true)');
    }

    return await this.generateWithPuppeteer(html, options);
  }

  static async generateFromHTML(htmlContent, options = {}) {
    return this.generatePDF(htmlContent, options);
  }

  static formatClientAddress(address) {
    if (!address) return '';
    if (typeof address === 'string') return address;
    return [address.street, address.city, address.state, address.zipCode, address.country]
      .filter(Boolean)
      .join(', ');
  }

  static formatBrandAddress(address) {
    if (!address) return '';
    return [address.street, address.city, address.state, address.zipCode, address.country]
      .filter(Boolean)
      .join(', ');
  }

  static async generateInvoicePDF(invoice, branding = null) {
    const clientAddress = this.formatClientAddress(invoice.client.address);

    const companyName = (branding && branding.companyName) || 'Your Business Name';
    const primaryColor = (branding && branding.colors && branding.colors.primary) || '#3b82f6';
    const contact = (branding && branding.contact) || {};
    const brandAddress = this.formatBrandAddress(contact.address);
    const showLogo = !branding || branding.showLogo !== false;
    const logoUrl = branding && branding.logo;
    const footerText = (branding && branding.invoice && branding.invoice.footer) || 'Thank you for your business!';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 20px;
          }
          .company-info h1 {
            color: ${primaryColor};
            margin: 0;
            font-size: 28px;
          }
          .company-logo {
            max-height: 60px;
            margin-bottom: 10px;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: ${primaryColor};
            margin: 0;
          }
          .billing-section {
            display: flex;
            justify-content: space-between;
            margin: 40px 0;
          }
          .bill-to, .invoice-info {
            flex: 1;
          }
          .bill-to {
            margin-right: 40px;
          }
          .section-title {
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 40px 0;
          }
          .items-table th {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #495057;
          }
          .items-table td {
            border: 1px solid #dee2e6;
            padding: 12px;
          }
          .items-table .text-right {
            text-align: right;
          }
          .totals-section {
            margin-left: auto;
            width: 300px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .total-row.final {
            border-bottom: 3px solid ${primaryColor};
            font-weight: bold;
            font-size: 18px;
            color: ${primaryColor};
          }
          .payment-info {
            margin-top: 40px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="company-logo"><br>` : ''}
            <h1>${companyName}</h1>
            <p>${brandAddress ? brandAddress + '<br>' : ''}
            ${contact.email ? `Email: ${contact.email}<br>` : ''}
            ${contact.phone ? `Phone: ${contact.phone}` : ''}</p>
          </div>
          <div class="invoice-details">
            <div class="invoice-number">INVOICE</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
          </div>
        </div>

        <div class="billing-section">
          <div class="bill-to">
            <div class="section-title">Bill To:</div>
            <div>
              <strong>${invoice.client.name}</strong><br>
              ${invoice.client.email}<br>
              ${clientAddress ? clientAddress + '<br>' : ''}
              ${invoice.client.phone || ''}
            </div>
          </div>
          <div class="invoice-info">
            <div class="section-title">Invoice Details:</div>
            <div>
              <strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}<br>
              <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}<br>
              <strong>Status:</strong> ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>
                  <strong>${item.description}</strong>
                  ${item.details ? `<br><small style="color: #6b7280;">${item.details}</small>` : ''}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${item.rate.toFixed(2)}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${invoice.subtotal.toFixed(2)}</span>
          </div>
          ${invoice.taxRate > 0 ? `
            <div class="total-row">
              <span>Tax (${(invoice.taxRate * 100).toFixed(1)}%):</span>
              <span>$${invoice.taxAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          ${invoice.discountAmount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-$${invoice.discountAmount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-row final">
            <span>Total:</span>
            <span>$${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div class="payment-info">
            <div class="section-title">Notes:</div>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="payment-info">
          <div class="section-title">Payment Information:</div>
          <p>${invoice.terms || 'Payment due within 30 days of invoice date.'}</p>
          <p>${footerText}</p>
        </div>

        <div class="footer">
          <p>This invoice was generated automatically on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;

    return this.generateFromHTML(htmlContent);
  }

  static async generateWithPuppeteer(html, options = {}) {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-features=VizDisplayCompositor'
      ],
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        ...options
      });

      // Puppeteer returns a plain Uint8Array, not a Node Buffer — Express's
      // res.send() only recognizes Buffer as binary, otherwise it JSON-serializes it.
      return Buffer.from(pdfData);
    } finally {
      await browser.close();
    }
  }

}

module.exports = PDFGenerator;
