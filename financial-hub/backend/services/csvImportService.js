const csv = require('csv-parser');
const fs = require('fs');
const { parse, isValid, format } = require('date-fns');

class CSVImportService {
  constructor() {
    this.supportedFormats = {
      // Standard format
      standard: {
        date: 'date',
        description: 'description',
        amount: 'amount',
        type: 'type', // 'income' or 'expense'
        category: 'category',
        account: 'account',
      },
      // Indian bank formats
      sbi: {
        date: 'Txn Date',
        description: 'Description',
        amount: 'Amount (INR)',
        type: null, // Will be determined by amount sign
        category: 'Description',
        account: 'Account No',
      },
      hdfc: {
        date: 'Date',
        description: 'Narration',
        amount: 'Amount',
        type: null,
        category: 'Narration',
        account: 'Account Number',
      },
      icici: {
        date: 'Transaction Date',
        description: 'Transaction Remarks',
        amount: 'Amount',
        type: null,
        category: 'Transaction Remarks',
        account: 'Account Number',
      },
      // US bank formats
      chase: {
        date: 'Transaction Date',
        description: 'Description',
        amount: 'Amount',
        type: 'Type',
        category: 'Category',
        account: 'Account',
      },
      bofa: {
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
        type: null,
        category: 'Description',
        account: 'Account Number',
      },
    };
  }

  // Detect CSV format based on headers
  detectFormat(headers) {
    const headerSet = new Set(headers.map(h => h.toLowerCase()));
    
    for (const [formatName, mapping] of Object.entries(this.supportedFormats)) {
      const requiredFields = Object.values(mapping).filter(Boolean);
      const matchCount = requiredFields.filter(field => 
        headerSet.has(field.toLowerCase())
      ).length;
      
      if (matchCount >= requiredFields.length * 0.7) { // 70% match threshold
        return formatName;
      }
    }
    
    return 'standard'; // Default to standard format
  }

  // Parse date with multiple formats
  parseDate(dateString) {
    const formats = [
      'yyyy-MM-dd',
      'MM/dd/yyyy',
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'MM-dd-yyyy',
      'yyyy/MM/dd',
      'dd MMM yyyy',
      'MMM dd, yyyy',
    ];

    for (const formatStr of formats) {
      try {
        const parsed = parse(dateString, formatStr, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error(`Unable to parse date: ${dateString}`);
  }

  // Clean and parse amount
  parseAmount(amountString) {
    if (!amountString) return 0;
    
    // Remove currency symbols, commas, and extra spaces
    const cleaned = amountString
      .toString()
      .replace(/[₹$€£¥,\s]/g, '')
      .replace(/[()]/g, ''); // Remove parentheses
    
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  // Determine transaction type based on amount or explicit type
  determineType(amount, typeField, description) {
    if (typeField) {
      const type = typeField.toLowerCase();
      if (type.includes('credit') || type.includes('deposit') || type.includes('income')) {
        return 'income';
      }
      if (type.includes('debit') || type.includes('withdrawal') || type.includes('expense')) {
        return 'expense';
      }
    }

    // Determine by amount sign
    if (amount > 0) return 'income';
    if (amount < 0) return 'expense';

    // Determine by description keywords
    const desc = description.toLowerCase();
    const incomeKeywords = ['salary', 'payment', 'refund', 'interest', 'dividend', 'bonus'];
    const expenseKeywords = ['purchase', 'payment to', 'withdrawal', 'fee', 'charge'];

    if (incomeKeywords.some(keyword => desc.includes(keyword))) {
      return 'income';
    }
    if (expenseKeywords.some(keyword => desc.includes(keyword))) {
      return 'expense';
    }

    return amount >= 0 ? 'income' : 'expense';
  }

  // Categorize transaction based on description
  categorizeTransaction(description) {
    const desc = description.toLowerCase();
    
    const categories = {
      'Food & Dining': ['restaurant', 'food', 'dining', 'swiggy', 'zomato', 'uber eats'],
      'Transportation': ['uber', 'taxi', 'bus', 'train', 'metro', 'petrol', 'gas'],
      'Shopping': ['amazon', 'flipkart', 'shopping', 'mall', 'store'],
      'Utilities': ['electricity', 'water', 'gas', 'internet', 'phone', 'mobile'],
      'Entertainment': ['movie', 'netflix', 'spotify', 'gaming', 'entertainment'],
      'Healthcare': ['hospital', 'doctor', 'medical', 'pharmacy', 'health'],
      'Income': ['salary', 'payment received', 'refund', 'interest', 'dividend'],
      'Business': ['business', 'client', 'freelance', 'consulting'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  // Process CSV file
  async processCSV(filePath, userId, format = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let detectedFormat = format;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
          if (!detectedFormat) {
            detectedFormat = this.detectFormat(headers);
          }
        })
        .on('data', (row) => {
          try {
            const mapping = this.supportedFormats[detectedFormat] || this.supportedFormats.standard;
            
            const dateField = Object.keys(row).find(key => 
              key.toLowerCase() === mapping.date.toLowerCase()
            );
            const descField = Object.keys(row).find(key => 
              key.toLowerCase() === mapping.description.toLowerCase()
            );
            const amountField = Object.keys(row).find(key => 
              key.toLowerCase() === mapping.amount.toLowerCase()
            );
            const typeField = mapping.type ? Object.keys(row).find(key => 
              key.toLowerCase() === mapping.type.toLowerCase()
            ) : null;
            const categoryField = mapping.category ? Object.keys(row).find(key => 
              key.toLowerCase() === mapping.category.toLowerCase()
            ) : null;

            if (!dateField || !descField || !amountField) {
              errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
              return;
            }

            const date = this.parseDate(row[dateField]);
            const amount = Math.abs(this.parseAmount(row[amountField]));
            const description = row[descField] || 'Unknown Transaction';
            const type = this.determineType(
              this.parseAmount(row[amountField]), 
              typeField ? row[typeField] : null,
              description
            );
            const category = this.categorizeTransaction(description);

            const transaction = {
              user: userId,
              date,
              description,
              amount,
              type,
              category: {
                primary: category,
                confidence: 0.8,
              },
              source: 'csv_import',
              importedAt: new Date(),
              csvFormat: detectedFormat,
              originalData: row,
            };

            results.push(transaction);
          } catch (error) {
            errors.push(`Error processing row: ${error.message}`);
          }
        })
        .on('end', () => {
          resolve({
            transactions: results,
            errors,
            format: detectedFormat,
            summary: {
              total: results.length,
              income: results.filter(t => t.type === 'income').length,
              expenses: results.filter(t => t.type === 'expense').length,
              totalIncome: results.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
              totalExpenses: results.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
            },
          });
        })
        .on('error', reject);
    });
  }

  // Validate CSV before processing
  async validateCSV(filePath) {
    return new Promise((resolve, reject) => {
      const headers = [];
      let rowCount = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', () => {
          rowCount++;
          if (rowCount > 10) return; // Only check first 10 rows for validation
        })
        .on('end', () => {
          const detectedFormat = this.detectFormat(headers);
          const mapping = this.supportedFormats[detectedFormat];
          
          resolve({
            isValid: true,
            headers,
            detectedFormat,
            mapping,
            estimatedRows: rowCount,
            supportedFormats: Object.keys(this.supportedFormats),
          });
        })
        .on('error', reject);
    });
  }
}

module.exports = new CSVImportService();
