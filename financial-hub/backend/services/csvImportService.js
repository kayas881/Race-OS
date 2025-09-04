const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { parse, format, isValid } = require('date-fns');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

class CSVImportService {
  constructor() {
    this.supportedFormats = {
      'sbi': {
        name: 'State Bank of India',
        country: 'IN',
        currency: 'INR',
        dateFormat: 'dd MMM yyyy',
        columns: {
          date: 'Txn Date',
          description: 'Description',
          amount: 'Amount (INR)',
          balance: 'Balance (INR)',
          reference: 'Ref No./Cheque No.'
        }
      },
      'hdfc': {
        name: 'HDFC Bank',
        country: 'IN',
        currency: 'INR',
        dateFormat: 'dd/MM/yyyy',
        columns: {
          date: 'Date',
          description: 'Narration',
          amount: 'Amount',
          balance: 'Balance',
          reference: 'Chq/Ref Number'
        }
      },
      'icici': {
        name: 'ICICI Bank',
        country: 'IN',
        currency: 'INR',
        dateFormat: 'dd-MM-yyyy',
        columns: {
          date: 'Transaction Date',
          description: 'Transaction Remarks',
          amount: 'Amount',
          balance: 'Balance',
          reference: 'Reference Number'
        }
      },
      'chase': {
        name: 'Chase Bank',
        country: 'US',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        columns: {
          date: 'Transaction Date',
          description: 'Description',
          amount: 'Amount',
          balance: 'Balance',
          reference: 'Check or Slip #'
        }
      },
      'bankofamerica': {
        name: 'Bank of America',
        country: 'US',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        columns: {
          date: 'Date',
          description: 'Description',
          amount: 'Amount',
          balance: 'Running Bal.',
          reference: 'Reference'
        }
      },
      'wells_fargo': {
        name: 'Wells Fargo',
        country: 'US',
        currency: 'USD',
        dateFormat: 'MM/dd/yyyy',
        columns: {
          date: 'Date',
          description: 'Description',
          amount: 'Amount',
          balance: 'Balance',
          reference: 'Reference'
        }
      },
      'generic': {
        name: 'Generic CSV Format',
        country: 'GLOBAL',
        currency: 'USD',
        dateFormat: 'yyyy-MM-dd',
        columns: {
          date: 'date',
          description: 'description',
          amount: 'amount',
          balance: 'balance',
          reference: 'reference'
        }
      }
    };
  }

  getSupportedFormats() {
    return Object.keys(this.supportedFormats).map(key => ({
      id: key,
      ...this.supportedFormats[key]
    }));
  }

  async importBankStatement(filePath, userId, options = {}) {
    try {
      const { bankName, accountType = 'checking', dateFormat } = options;
      
      // Detect format if not specified
      const format = this.detectFormat(filePath, bankName);
      
      // Read and parse CSV file
      const transactions = await this.parseCSV(filePath, format, dateFormat);
      
      // Create or find account
      const account = await this.getOrCreateAccount(userId, format, accountType);
      
      // Process and save transactions
      const results = await this.processTransactions(transactions, account, format);
      
      return {
        success: true,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors,
        accountId: account._id,
        format: format.name
      };
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw new Error(`CSV import failed: ${error.message}`);
    }
  }

  detectFormat(filePath, bankName) {
    // If bank name is provided, try to match it
    if (bankName) {
      const bankKey = bankName.toLowerCase().replace(/\s+/g, '_');
      
      // Try exact match
      if (this.supportedFormats[bankKey]) {
        return this.supportedFormats[bankKey];
      }
      
      // Try partial match
      for (const [key, format] of Object.entries(this.supportedFormats)) {
        if (format.name.toLowerCase().includes(bankName.toLowerCase()) ||
            bankName.toLowerCase().includes(key)) {
          return format;
        }
      }
    }
    
    // Default to generic format
    return this.supportedFormats.generic;
  }

  async parseCSV(filePath, format, customDateFormat) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      const dateFormat = customDateFormat || format.dateFormat;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const transaction = this.parseTransaction(row, format, dateFormat);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            console.warn('Error parsing transaction row:', error.message);
          }
        })
        .on('end', () => {
          resolve(transactions);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  parseTransaction(row, format, dateFormat) {
    const columns = format.columns;
    
    // Extract basic data
    const dateStr = row[columns.date];
    const description = row[columns.description];
    const amountStr = row[columns.amount];
    const balanceStr = row[columns.balance];
    const reference = row[columns.reference];
    
    if (!dateStr || !description || !amountStr) {
      return null; // Skip incomplete rows
    }
    
    // Parse date
    let date;
    try {
      if (dateFormat.includes('MMM')) {
        // Handle month abbreviations (e.g., "Jan", "Feb")
        date = parse(dateStr, dateFormat, new Date());
      } else {
        date = parse(dateStr, dateFormat, new Date());
      }
      
      if (!isValid(date)) {
        // Try alternative date formats
        const altFormats = ['yyyy-MM-dd', 'MM/dd/yyyy', 'dd/MM/yyyy', 'dd-MM-yyyy'];
        for (const altFormat of altFormats) {
          date = parse(dateStr, altFormat, new Date());
          if (isValid(date)) break;
        }
      }
      
      if (!isValid(date)) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
    } catch (error) {
      console.warn(`Date parsing error for "${dateStr}":`, error.message);
      return null;
    }
    
    // Parse amount
    let amount;
    try {
      // Remove currency symbols and commas
      const cleanAmount = amountStr.replace(/[₹$,\s]/g, '');
      amount = parseFloat(cleanAmount);
      
      if (isNaN(amount)) {
        throw new Error(`Invalid amount: ${amountStr}`);
      }
    } catch (error) {
      console.warn(`Amount parsing error for "${amountStr}":`, error.message);
      return null;
    }
    
    // Parse balance (optional)
    let balance = null;
    if (balanceStr) {
      try {
        const cleanBalance = balanceStr.replace(/[₹$,\s]/g, '');
        balance = parseFloat(cleanBalance);
      } catch (error) {
        // Balance parsing is optional
      }
    }
    
    // Determine transaction type (debit/credit)
    // Negative amounts are typically debits
    const type = amount < 0 ? 'debit' : 'credit';
    
    return {
      date,
      description: description.trim(),
      amount: Math.abs(amount), // Store as positive value
      type,
      balance,
      reference: reference?.trim(),
      currency: format.currency,
      category: this.categorizeTransaction(description)
    };
  }

  categorizeTransaction(description) {
    const desc = description.toLowerCase();
    
    // Simple categorization rules
    if (desc.includes('salary') || desc.includes('payroll')) return 'income';
    if (desc.includes('grocery') || desc.includes('supermarket')) return 'groceries';
    if (desc.includes('fuel') || desc.includes('gas') || desc.includes('petrol')) return 'transportation';
    if (desc.includes('restaurant') || desc.includes('food') || desc.includes('dining')) return 'dining';
    if (desc.includes('atm') || desc.includes('cash withdrawal')) return 'cash';
    if (desc.includes('transfer') || desc.includes('tfr')) return 'transfer';
    if (desc.includes('payment') || desc.includes('bill')) return 'bills';
    if (desc.includes('interest')) return 'interest';
    if (desc.includes('fee') || desc.includes('charge')) return 'fees';
    if (desc.includes('medical') || desc.includes('hospital')) return 'healthcare';
    if (desc.includes('insurance')) return 'insurance';
    if (desc.includes('rent')) return 'housing';
    if (desc.includes('shopping') || desc.includes('purchase')) return 'shopping';
    if (desc.includes('subscription') || desc.includes('netflix') || desc.includes('spotify')) return 'subscriptions';
    
    return 'other';
  }

  async getOrCreateAccount(userId, format, accountType) {
    try {
      // Try to find existing account for this bank
      let account = await Account.findOne({
        user: userId,
        bankName: format.name,
        accountType: accountType
      });
      
      if (!account) {
        // Create new account
        account = new Account({
          user: userId,
          accountName: `${format.name} ${accountType.charAt(0).toUpperCase() + accountType.slice(1)}`,
          accountType: accountType,
          balance: 0,
          currency: format.currency,
          bankName: format.name,
          country: format.country,
          isActive: true
        });
        
        await account.save();
      }
      
      return account;
    } catch (error) {
      console.error('Error creating/finding account:', error);
      throw new Error('Failed to create account for CSV import');
    }
  }

  async processTransactions(transactions, account, format) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const transactionData of transactions) {
      try {
        // Check if transaction already exists (duplicate detection)
        const existingTransaction = await Transaction.findOne({
          user: account.user,
          account: account._id,
          date: transactionData.date,
          amount: transactionData.amount,
          description: transactionData.description
        });
        
        if (existingTransaction) {
          results.skipped++;
          continue;
        }
        
        // Create new transaction
        const transaction = new Transaction({
          user: account.user,
          account: account._id,
          date: transactionData.date,
          description: transactionData.description,
          amount: transactionData.amount,
          type: transactionData.type,
          category: transactionData.category,
          currency: transactionData.currency,
          balance: transactionData.balance,
          reference: transactionData.reference,
          source: 'csv_import',
          metadata: {
            bankName: format.name,
            importDate: new Date(),
            originalDescription: transactionData.description
          }
        });
        
        await transaction.save();
        results.imported++;
        
        // Update account balance if this is the latest transaction
        if (transactionData.balance !== null) {
          const latestTransaction = await Transaction.findOne({
            account: account._id
          }).sort({ date: -1 });
          
          if (latestTransaction && latestTransaction._id.equals(transaction._id)) {
            account.balance = transactionData.balance;
            account.lastUpdated = new Date();
            await account.save();
          }
        }
        
      } catch (error) {
        console.error('Error processing transaction:', error);
        results.errors.push({
          transaction: transactionData,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async validateCSV(filePath, expectedFormat) {
    return new Promise((resolve, reject) => {
      const headers = [];
      let rowCount = 0;
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          rowCount++;
          if (rowCount >= 5) {
            // Stop after reading 5 rows for validation
            return;
          }
        })
        .on('end', () => {
          const validation = {
            isValid: true,
            headers,
            rowCount,
            missingColumns: [],
            suggestions: []
          };
          
          // Check if required columns exist
          const format = this.supportedFormats[expectedFormat] || this.supportedFormats.generic;
          const requiredColumns = Object.values(format.columns);
          
          for (const column of requiredColumns) {
            if (!headers.includes(column)) {
              validation.missingColumns.push(column);
              validation.isValid = false;
            }
          }
          
          // Suggest alternative formats if current one doesn't match
          if (!validation.isValid) {
            validation.suggestions = this.suggestFormats(headers);
          }
          
          resolve(validation);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  suggestFormats(headers) {
    const suggestions = [];
    
    for (const [key, format] of Object.entries(this.supportedFormats)) {
      const requiredColumns = Object.values(format.columns);
      const matchingColumns = requiredColumns.filter(col => headers.includes(col));
      const matchPercentage = (matchingColumns.length / requiredColumns.length) * 100;
      
      if (matchPercentage > 60) { // Suggest formats with >60% column match
        suggestions.push({
          format: key,
          name: format.name,
          matchPercentage: Math.round(matchPercentage),
          matchingColumns: matchingColumns.length,
          totalColumns: requiredColumns.length
        });
      }
    }
    
    return suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  async getImportHistory(userId, limit = 10) {
    try {
      // Get recent CSV imports
      const imports = await Transaction.aggregate([
        {
          $match: {
            user: userId,
            source: 'csv_import'
          }
        },
        {
          $group: {
            _id: {
              bankName: '$metadata.bankName',
              importDate: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$metadata.importDate'
                }
              }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            firstImport: { $min: '$metadata.importDate' },
            lastImport: { $max: '$metadata.importDate' }
          }
        },
        {
          $sort: { lastImport: -1 }
        },
        {
          $limit: limit
        }
      ]);
      
      return imports;
    } catch (error) {
      console.error('Error fetching import history:', error);
      throw new Error('Failed to fetch import history');
    }
  }
}

module.exports = new CSVImportService();
