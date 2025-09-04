const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  async initializeTransporter() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production email service (e.g., SendGrid, Mailgun, etc.)
      this.transporter = nodemailer.createTransporter({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Development: Use Ethereal Email for testing
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Email service initialized with test account:', testAccount.user);
      } catch (error) {
        console.error('Error creating test email account:', error);
      }
    }
  }

  // Generate email templates with custom branding
  generateEmailTemplate(type, data, branding = null) {
    const defaultBranding = {
      companyName: 'Race-OS',
      logo: null,
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      website: 'https://yourdomain.com'
    };

    const brand = { ...defaultBranding, ...branding };

    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${brand.primaryColor}; color: white; padding: 20px; text-align: center; }
        .logo { max-height: 60px; margin-bottom: 10px; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; color: #6b7280; text-align: center; padding: 20px; font-size: 14px; }
        .button { display: inline-block; background: ${brand.primaryColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .amount { font-size: 24px; font-weight: bold; color: ${brand.primaryColor}; }
        .overdue { color: #dc2626; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .table th { background: #f9fafb; font-weight: 600; }
      </style>
    `;

    switch (type) {
      case 'invoice-reminder':
        return this.generateInvoiceReminderTemplate(data, brand, baseStyles);
      case 'overdue-invoice':
        return this.generateOverdueInvoiceTemplate(data, brand, baseStyles);
      case 'weekly-summary':
        return this.generateWeeklySummaryTemplate(data, brand, baseStyles);
      case 'payment-confirmation':
        return this.generatePaymentConfirmationTemplate(data, brand, baseStyles);
      default:
        throw new Error(`Unknown email template type: ${type}`);
    }
  }

  generateInvoiceReminderTemplate(data, brand, styles) {
    const { invoice, client, daysUntilDue } = data;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Reminder - ${invoice.invoiceNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${brand.logo ? `<img src="${brand.logo}" alt="${brand.companyName}" class="logo">` : ''}
            <h1>${brand.companyName}</h1>
          </div>
          
          <div class="content">
            <h2>Payment Reminder</h2>
            <p>Dear ${client.name},</p>
            
            <p>This is a friendly reminder that your invoice is due in <strong>${daysUntilDue} days</strong>.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Amount Due:</strong> <span class="amount">$${invoice.total.toLocaleString()}</span></p>
            </div>
            
            <p>To ensure your account remains in good standing, please submit payment by the due date.</p>
            
            <a href="${brand.website}/invoices/${invoice._id}" class="button">View Invoice</a>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
            
            <p>Thank you for your business!</p>
          </div>
          
          <div class="footer">
            <p>${brand.companyName}</p>
            <p>This is an automated reminder. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateOverdueInvoiceTemplate(data, brand, styles) {
    const { invoice, client, daysOverdue } = data;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Overdue Invoice - ${invoice.invoiceNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${brand.logo ? `<img src="${brand.logo}" alt="${brand.companyName}" class="logo">` : ''}
            <h1>${brand.companyName}</h1>
          </div>
          
          <div class="content">
            <h2 class="overdue">Overdue Payment Notice</h2>
            <p>Dear ${client.name},</p>
            
            <p>Our records indicate that the following invoice is now <span class="overdue">${daysOverdue} days overdue</span>:</p>
            
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Overdue Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Original Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><strong>Days Overdue:</strong> <span class="overdue">${daysOverdue} days</span></p>
              <p><strong>Amount Due:</strong> <span class="amount overdue">$${invoice.total.toLocaleString()}</span></p>
            </div>
            
            <p><strong>Immediate action is required.</strong> Please remit payment as soon as possible to avoid any service interruptions.</p>
            
            <a href="${brand.website}/invoices/${invoice._id}" class="button">Pay Now</a>
            
            <p>If you believe this notice was sent in error or if you have already submitted payment, please contact us immediately.</p>
            
            <p>We value your business and look forward to resolving this matter promptly.</p>
          </div>
          
          <div class="footer">
            <p>${brand.companyName}</p>
            <p>This is an automated notice. Please contact us if you need assistance.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWeeklySummaryTemplate(data, brand, styles) {
    const { summary, weekStart, weekEnd, transactions, taxInfo } = data;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Financial Summary</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${brand.logo ? `<img src="${brand.logo}" alt="${brand.companyName}" class="logo">` : ''}
            <h1>Weekly Financial Summary</h1>
            <p>${new Date(weekStart).toLocaleDateString()} - ${new Date(weekEnd).toLocaleDateString()}</p>
          </div>
          
          <div class="content">
            <h2>Week at a Glance</h2>
            
            <table class="table">
              <tr>
                <th>Metric</th>
                <th>This Week</th>
                <th>YTD Total</th>
              </tr>
              <tr>
                <td>Total Income</td>
                <td class="amount" style="color: #059669;">$${summary.weeklyIncome.toLocaleString()}</td>
                <td>$${summary.ytdIncome.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Total Expenses</td>
                <td style="color: #dc2626;">$${summary.weeklyExpenses.toLocaleString()}</td>
                <td>$${summary.ytdExpenses.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Net Profit</td>
                <td class="amount">$${(summary.weeklyIncome - summary.weeklyExpenses).toLocaleString()}</td>
                <td>$${(summary.ytdIncome - summary.ytdExpenses).toLocaleString()}</td>
              </tr>
            </table>
            
            <h3>Tax Information</h3>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Estimated Tax Set-Aside (Weekly):</strong> $${taxInfo.weeklyTaxSetAside.toLocaleString()}</p>
              <p><strong>YTD Tax Liability:</strong> $${taxInfo.ytdTaxLiability.toLocaleString()}</p>
              <p><strong>Next Quarterly Due:</strong> ${new Date(taxInfo.nextQuarterlyDue).toLocaleDateString()}</p>
            </div>
            
            ${transactions.length > 0 ? `
            <h3>Recent Transactions</h3>
            <table class="table">
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
              </tr>
              ${transactions.slice(0, 10).map(tx => `
                <tr>
                  <td>${new Date(tx.date).toLocaleDateString()}</td>
                  <td>${tx.description}</td>
                  <td>${tx.category}</td>
                  <td style="color: ${tx.type === 'income' ? '#059669' : '#dc2626'}">
                    ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toLocaleString()}
                  </td>
                </tr>
              `).join('')}
            </table>
            ` : ''}
            
            <a href="${brand.website}/dashboard" class="button">View Full Dashboard</a>
          </div>
          
          <div class="footer">
            <p>${brand.companyName}</p>
            <p>This is your automated weekly summary. Manage your preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generatePaymentConfirmationTemplate(data, brand, styles) {
    const { invoice, client, payment } = data;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmation - ${invoice.invoiceNumber}</title>
        ${styles}
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${brand.logo ? `<img src="${brand.logo}" alt="${brand.companyName}" class="logo">` : ''}
            <h1>${brand.companyName}</h1>
          </div>
          
          <div class="content">
            <h2 style="color: #059669;">Payment Received</h2>
            <p>Dear ${client.name},</p>
            
            <p>Thank you! We have received your payment for invoice ${invoice.invoiceNumber}.</p>
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Payment Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Payment Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
              <p><strong>Amount Paid:</strong> <span class="amount" style="color: #059669;">$${payment.amount.toLocaleString()}</span></p>
              <p><strong>Payment Method:</strong> ${payment.method}</p>
              ${payment.reference ? `<p><strong>Reference:</strong> ${payment.reference}</p>` : ''}
            </div>
            
            <p>Your account is now up to date. We appreciate your prompt payment!</p>
            
            <a href="${brand.website}/invoices/${invoice._id}" class="button">View Invoice</a>
          </div>
          
          <div class="footer">
            <p>${brand.companyName}</p>
            <p>Thank you for your business!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send email
  async sendEmail(to, subject, htmlContent, attachments = []) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@financialhub.com',
        to,
        subject,
        html: htmlContent,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📧 Email sent:', nodemailer.getTestMessageUrl(info));
      }
      
      return {
        success: true,
        messageId: info.messageId,
        testUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send invoice reminder
  async sendInvoiceReminder(invoice, client, branding = null) {
    const daysUntilDue = Math.ceil((new Date(invoice.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    const htmlContent = this.generateEmailTemplate('invoice-reminder', {
      invoice,
      client,
      daysUntilDue
    }, branding);

    return await this.sendEmail(
      client.email,
      `Invoice Reminder - ${invoice.invoiceNumber}`,
      htmlContent
    );
  }

  // Send overdue notice
  async sendOverdueNotice(invoice, client, branding = null) {
    const daysOverdue = Math.ceil((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
    
    const htmlContent = this.generateEmailTemplate('overdue-invoice', {
      invoice,
      client,
      daysOverdue
    }, branding);

    return await this.sendEmail(
      client.email,
      `Overdue Payment Notice - ${invoice.invoiceNumber}`,
      htmlContent
    );
  }

  // Send weekly summary
  async sendWeeklySummary(userEmail, summaryData, branding = null) {
    const htmlContent = this.generateEmailTemplate('weekly-summary', summaryData, branding);

    return await this.sendEmail(
      userEmail,
      `Weekly Financial Summary - ${new Date(summaryData.weekStart).toLocaleDateString()}`,
      htmlContent
    );
  }

  // Send payment confirmation
  async sendPaymentConfirmation(invoice, client, payment, branding = null) {
    const htmlContent = this.generateEmailTemplate('payment-confirmation', {
      invoice,
      client,
      payment
    }, branding);

    return await this.sendEmail(
      client.email,
      `Payment Confirmation - ${invoice.invoiceNumber}`,
      htmlContent
    );
  }
}

module.exports = new EmailService();
