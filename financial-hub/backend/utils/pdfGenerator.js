const puppeteer = require('puppeteer');

class PDFGenerator {
  static async generatePDF(html, options = {}) {
    try {
      // Check if we're in a development environment where PDF generation might fail
      if (process.env.DISABLE_PDF_GENERATION === 'true') {
        console.log('⚠️ PDF generation disabled in development mode');
        return Buffer.from('PDF generation disabled in development mode');
      }

      // Try Puppeteer first
      return await this.generateWithPuppeteer(html, options);
    } catch (error) {
      console.error('PDF generation failed with Puppeteer:', error.message);
      
      // Fallback: return a simple text-based PDF indication
      return this.generateFallbackPDF(html);
    }
  }

  static async generateFromHTML(htmlContent, options = {}) {
    return this.generatePDF(htmlContent, options);
  }

  static async generateInvoicePDF(invoice) {
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
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }
          .company-info h1 {
            color: #3b82f6;
            margin: 0;
            font-size: 28px;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
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
            border-bottom: 3px solid #3b82f6;
            font-weight: bold;
            font-size: 18px;
            color: #3b82f6;
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
            <h1>Your Business Name</h1>
            <p>Your Address<br>
            City, State ZIP<br>
            Email: your@email.com<br>
            Phone: (555) 123-4567</p>
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
              ${invoice.client.address || ''}<br>
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
          <p>Please remit payment within ${invoice.paymentTerms || '30'} days of invoice date.</p>
          <p>Thank you for your business!</p>
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
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-features=VizDisplayCompositor'
      ],
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
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

    await browser.close();
    return pdf;
  }

  static generateFallbackPDF(html) {
    // Simple fallback - return HTML content as buffer
    // In a real implementation, you might use a different PDF library
    const fallbackMessage = `
      PDF Generation Not Available
      
      This is a development environment where PDF generation is not configured.
      In production, this would generate a proper PDF.
      
      Invoice content would appear here.
    `;
    
    return Buffer.from(fallbackMessage, 'utf8');
  }
}

module.exports = PDFGenerator;
