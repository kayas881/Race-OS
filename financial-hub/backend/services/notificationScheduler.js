const cron = require('node-cron');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const User = require('../models/User');
const Branding = require('../models/Branding');
const Transaction = require('../models/Transaction');
const emailService = require('./emailService');
const taxService = require('./taxService');

class NotificationScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start all scheduled jobs
  start() {
    if (this.isRunning) {
      console.log('📅 Notification scheduler is already running');
      return;
    }

    console.log('📅 Starting notification scheduler...');

    // Daily check for invoice reminders and overdue notices (9 AM)
    this.jobs.set('dailyInvoiceCheck', cron.schedule('0 9 * * *', async () => {
      console.log('🔍 Running daily invoice reminder check...');
      await this.checkInvoiceReminders();
      await this.checkOverdueInvoices();
    }, { scheduled: false }));

    // Weekly summary emails (Monday 8 AM)
    this.jobs.set('weeklySummary', cron.schedule('0 8 * * 1', async () => {
      console.log('📊 Sending weekly summary emails...');
      await this.sendWeeklySummaries();
    }, { scheduled: false }));

    // Start all jobs
    this.jobs.forEach(job => job.start());
    this.isRunning = true;

    console.log('✅ Notification scheduler started with', this.jobs.size, 'jobs');
  }

  // Stop all scheduled jobs
  stop() {
    console.log('🛑 Stopping notification scheduler...');
    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ Notification scheduler stopped');
  }

  // Check for invoices that need reminders
  async checkInvoiceReminders() {
    try {
      const users = await User.find({ 'notifications.emailReminders': true });
      
      for (const user of users) {
        const branding = await Branding.getOrCreateForUser(user._id);
        const reminderDays = branding.notifications.emailReminders.daysBefore || 3;
        
        // Calculate reminder date
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + reminderDays);
        reminderDate.setHours(23, 59, 59, 999); // End of day
        
        const startOfReminderDate = new Date(reminderDate);
        startOfReminderDate.setHours(0, 0, 0, 0); // Start of day

        // Find invoices due within reminder period
        const invoicesToRemind = await Invoice.find({
          user: user._id,
          status: { $in: ['sent', 'viewed'] },
          dueDate: {
            $gte: startOfReminderDate,
            $lte: reminderDate
          },
          // Don't send reminder if already sent today
          $or: [
            { lastReminderSent: { $exists: false } },
            { lastReminderSent: { $lt: startOfReminderDate } }
          ]
        });

        console.log(`📧 Found ${invoicesToRemind.length} invoices for reminders (User: ${user.email})`);

        for (const invoice of invoicesToRemind) {
          try {
            // Get client info from embedded client data
            const clientData = invoice.client;
            
            const result = await emailService.sendInvoiceReminder(
              invoice,
              clientData,
              branding.getEmailBranding()
            );

            if (result.success) {
              // Update last reminder sent date
              invoice.lastReminderSent = new Date();
              await invoice.save();
              console.log(`✅ Reminder sent for invoice ${invoice.invoiceNumber}`);
            } else {
              console.error(`❌ Failed to send reminder for invoice ${invoice.invoiceNumber}:`, result.error);
            }
          } catch (error) {
            console.error(`❌ Error sending reminder for invoice ${invoice.invoiceNumber}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in checkInvoiceReminders:', error);
    }
  }

  // Check for overdue invoices
  async checkOverdueInvoices() {
    try {
      const users = await User.find({ 'notifications.overdueNotices': true });
      
      for (const user of users) {
        const branding = await Branding.getOrCreateForUser(user._id);
        const noticeDays = branding.notifications.overdueNotices.daysAfter || [1, 7, 14, 30];
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find overdue invoices
        const overdueInvoices = await Invoice.find({
          user: user._id,
          status: { $in: ['sent', 'viewed', 'overdue'] },
          dueDate: { $lt: today }
        });

        console.log(`🚨 Found ${overdueInvoices.length} overdue invoices (User: ${user.email})`);

        for (const invoice of overdueInvoices) {
          try {
            const daysOverdue = Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));
            
            // Check if we should send notice for this number of days overdue
            if (noticeDays.includes(daysOverdue)) {
              const clientData = invoice.client;
              
              const result = await emailService.sendOverdueNotice(
                invoice,
                clientData,
                branding.getEmailBranding()
              );

              if (result.success) {
                // Update invoice status to overdue if not already
                if (invoice.status !== 'overdue') {
                  invoice.status = 'overdue';
                }
                invoice.lastOverdueNotice = new Date();
                await invoice.save();
                console.log(`🚨 Overdue notice sent for invoice ${invoice.invoiceNumber} (${daysOverdue} days)`);
              } else {
                console.error(`❌ Failed to send overdue notice for invoice ${invoice.invoiceNumber}:`, result.error);
              }
            }
          } catch (error) {
            console.error(`❌ Error sending overdue notice for invoice ${invoice.invoiceNumber}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in checkOverdueInvoices:', error);
    }
  }

  // Send weekly summary emails
  async sendWeeklySummaries() {
    try {
      const users = await User.find({ 'notifications.weeklySummary': true });
      
      for (const user of users) {
        try {
          const branding = await Branding.getOrCreateForUser(user._id);
          
          // Calculate week range
          const weekEnd = new Date();
          weekEnd.setHours(23, 59, 59, 999);
          
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);

          // Get weekly transactions
          const transactions = await Transaction.find({
            userId: user._id,
            date: {
              $gte: weekStart,
              $lte: weekEnd
            }
          }).sort({ date: -1 });

          // Calculate weekly summary
          const weeklyIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const weeklyExpenses = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

          // Get YTD totals
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          const ytdTransactions = await Transaction.find({
            userId: user._id,
            date: { $gte: yearStart }
          });

          const ytdIncome = ytdTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);

          const ytdExpenses = ytdTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

          // Get tax information
          const taxInfo = await taxService.calculateYTDLiability(user._id);
          const quarterlyDates = taxService.getQuarterlyDueDates();
          
          const summaryData = {
            summary: {
              weeklyIncome,
              weeklyExpenses,
              ytdIncome,
              ytdExpenses
            },
            weekStart,
            weekEnd,
            transactions: branding.notifications.weeklySummary.includeTransactions ? transactions : [],
            taxInfo: branding.notifications.weeklySummary.includeTaxInfo ? {
              weeklyTaxSetAside: weeklyIncome * 0.30, // 30% default rate
              ytdTaxLiability: taxInfo.totalLiability || 0,
              nextQuarterlyDue: quarterlyDates.find(date => new Date(date.date) > new Date())?.date || quarterlyDates[0].date
            } : {}
          };

          const result = await emailService.sendWeeklySummary(
            user.email,
            summaryData,
            branding.getEmailBranding()
          );

          if (result.success) {
            console.log(`📊 Weekly summary sent to ${user.email}`);
          } else {
            console.error(`❌ Failed to send weekly summary to ${user.email}:`, result.error);
          }
        } catch (error) {
          console.error(`❌ Error sending weekly summary to ${user.email}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error in sendWeeklySummaries:', error);
    }
  }

  // Manual trigger for testing
  async triggerInvoiceReminders() {
    console.log('🧪 Manually triggering invoice reminders...');
    await this.checkInvoiceReminders();
  }

  async triggerOverdueCheck() {
    console.log('🧪 Manually triggering overdue check...');
    await this.checkOverdueInvoices();
  }

  async triggerWeeklySummary() {
    console.log('🧪 Manually triggering weekly summary...');
    await this.sendWeeklySummaries();
  }

  // Get status of scheduler
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.jobs.size,
      jobs: Array.from(this.jobs.keys())
    };
  }
}

module.exports = new NotificationScheduler();
