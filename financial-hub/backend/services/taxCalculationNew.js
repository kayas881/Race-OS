const TaxCalculation = require('../models/TaxCalculation');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class TaxCalculationService {
  constructor() {
    // Multi-country support
    this.supportedCountries = ['US', 'IN'];
    
    // US Tax System (2024)
    this.federalTaxBrackets = [
      { min: 0, max: 11000, rate: 0.10 },
      { min: 11000, max: 44725, rate: 0.12 },
      { min: 44725, max: 95375, rate: 0.22 },
      { min: 95375, max: 182050, rate: 0.24 },
      { min: 182050, max: 231250, rate: 0.32 },
      { min: 231250, max: 578125, rate: 0.35 },
      { min: 578125, max: Infinity, rate: 0.37 }
    ];

    // Indian Tax System (FY 2024-25 - New Tax Regime)
    this.indianTaxBrackets = [
      { min: 0, max: 300000, rate: 0.00 },      // Up to ₹3 lakh - No tax
      { min: 300000, max: 700000, rate: 0.05 },  // ₹3-7 lakh - 5%
      { min: 700000, max: 1000000, rate: 0.10 }, // ₹7-10 lakh - 10%
      { min: 1000000, max: 1200000, rate: 0.15 }, // ₹10-12 lakh - 15%
      { min: 1200000, max: 1500000, rate: 0.20 }, // ₹12-15 lakh - 20%
      { min: 1500000, max: Infinity, rate: 0.30 } // Above ₹15 lakh - 30%
    ];

    // Indian Tax System (Old Tax Regime with deductions)
    this.indianTaxBracketsOld = [
      { min: 0, max: 250000, rate: 0.00 },      // Up to ₹2.5 lakh - No tax
      { min: 250000, max: 500000, rate: 0.05 },  // ₹2.5-5 lakh - 5%
      { min: 500000, max: 1000000, rate: 0.20 }, // ₹5-10 lakh - 20%
      { min: 1000000, max: Infinity, rate: 0.30 } // Above ₹10 lakh - 30%
    ];

    // 2024 Federal Tax Brackets (Married Filing Jointly)
    this.federalTaxBracketsMarried = [
      { min: 0, max: 22000, rate: 0.10 },
      { min: 22000, max: 89450, rate: 0.12 },
      { min: 89450, max: 190750, rate: 0.22 },
      { min: 190750, max: 364200, rate: 0.24 },
      { min: 364200, max: 462500, rate: 0.32 },
      { min: 462500, max: 693750, rate: 0.35 },
      { min: 693750, max: Infinity, rate: 0.37 }
    ];

    // Self-employment tax rates (US)
    this.selfEmploymentTaxRate = 0.1413; // 14.13% (12.4% Social Security + 1.45% Medicare)
    this.additionalMedicareTaxThreshold = 200000;
    this.additionalMedicareTaxRate = 0.009;

    // Indian GST rates for different services
    this.indianGSTRates = {
      digitalServices: 0.18,      // YouTube, streaming, digital content
      consultingServices: 0.18,   // Consulting, coaching
      educationalContent: 0.12,   // Educational courses, tutorials
      softwareServices: 0.18,     // Software development, apps
      advertisingServices: 0.18,  // Sponsored content, ads
      exemptServices: 0.00        // Some educational and healthcare content
    };

    // Indian creator-specific tax rules
    this.indianCreatorTaxRules = {
      presumptiveBusinessIncome: {
        digitalServices: 0.50,     // 50% of income considered profit (Section 44ADA)
        threshold: 5000000         // ₹50 lakh threshold for presumptive taxation
      },
      professionalTax: {
        maxAnnual: 2500           // Maximum ₹2,500 per year (varies by state)
      },
      deductions: {
        section80C: 150000,       // ₹1.5 lakh (PF, insurance, tax-saving FDs)
        section80D: 25000,        // ₹25,000 for health insurance (under 60)
        section80D_senior: 50000, // ₹50,000 for health insurance (60+)
        section80E: Infinity,     // Education loan interest (no limit)
        section80G: 0.50,         // 50% deduction for donations
        homeOfficeFurniture: 100000, // ₹1 lakh per year depreciation
        internetPhone: 50000,     // ₹50,000 per year for business use
        equipmentDepreciation: 0.60 // 60% depreciation on computers, cameras
      },
      tds: {
        professionalServices: 0.10, // 10% TDS on professional fees
        digitalAdvertising: 0.10,   // 10% TDS on digital advertising
        threshold: 30000            // ₹30,000 threshold for TDS
      }
    };

    // Standard deductions for 2024 (US)
    this.standardDeductions = {
      single: 13850,
      married_joint: 27700,
      married_separate: 13850,
      head_of_household: 20800
    };

    // Indian standard deduction
    this.indianStandardDeduction = 50000; // ₹50,000 for salaried individuals

    // State tax rates by state (2024 estimates)
    this.stateTaxRates = {
      'AL': 0.05, 'AK': 0.00, 'AZ': 0.025, 'AR': 0.055, 'CA': 0.093,
      'CO': 0.044, 'CT': 0.069, 'DE': 0.066, 'FL': 0.00, 'GA': 0.057,
      'HI': 0.11, 'ID': 0.058, 'IL': 0.0495, 'IN': 0.032, 'IA': 0.084,
      'KS': 0.057, 'KY': 0.05, 'LA': 0.06, 'ME': 0.075, 'MD': 0.0575,
      'MA': 0.05, 'MI': 0.0425, 'MN': 0.0985, 'MS': 0.05, 'MO': 0.054,
      'MT': 0.069, 'NE': 0.068, 'NV': 0.00, 'NH': 0.00, 'NJ': 0.097,
      'NM': 0.059, 'NY': 0.0865, 'NC': 0.0475, 'ND': 0.029, 'OH': 0.0399,
      'OK': 0.05, 'OR': 0.099, 'PA': 0.0307, 'RI': 0.0599, 'SC': 0.07,
      'SD': 0.00, 'TN': 0.00, 'TX': 0.00, 'UT': 0.0495, 'VT': 0.0875,
      'VA': 0.0575, 'WA': 0.00, 'WV': 0.065, 'WI': 0.0765, 'WY': 0.00
    };

    // Creator-specific tax rules (US)
    this.creatorTaxRules = {
      homeOfficeDeduction: {
        perSquareFootDeduction: 5, // $5 per square foot
        maxDeduction: 1500,        // Maximum $1,500 per year
        maxSquareFeet: 300         // Maximum 300 square feet
      },
      equipmentDepreciation: {
        computerEquipment: 0.20,   // 20% per year (5-year depreciation)
        cameraEquipment: 0.1429,   // 14.29% per year (7-year depreciation)
        furnitureFixtures: 0.1429, // 7-year depreciation
        softwareDepreciation: 0.3333 // 3-year depreciation for software
      },
      businessExpenseRates: {
        mealDeduction: 0.50,       // 50% deductible for business meals
        travelDeduction: 1.00,     // 100% deductible for business travel
        educationDeduction: 1.00,  // 100% deductible for professional development
        internetPhoneDeduction: 0.50 // Typically 50% for mixed use
      }
    };
  }

  // Main tax calculation method
  async calculateTaxes(userId, year = new Date().getFullYear(), quarter = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const country = user.taxInfo?.country || 'US';

      // Calculate period
      let startDate, endDate;
      if (quarter) {
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);
        startDate = quarterStart;
        endDate = quarterEnd;
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
      }

      // Get income and expense data
      const incomeData = await this.calculateIncome(userId, startDate, endDate);
      const expenseData = await this.calculateExpenses(userId, startDate, endDate);

      // Calculate based on country
      if (country === 'IN') {
        return await this.calculateIndianTaxes(userId, incomeData, expenseData, year, quarter, user);
      } else {
        return await this.calculateUSTaxes(userId, incomeData, expenseData, year, quarter, user);
      }

    } catch (error) {
      console.error('Tax calculation error:', error);
      throw error;
    }
  }

  // US Tax Calculation
  async calculateUSTaxes(userId, incomeData, expenseData, year, quarter, user) {
    const adjustedGrossIncome = incomeData.businessIncome - expenseData.deductibleExpenses;
    const selfEmploymentIncome = Math.max(0, adjustedGrossIncome);

    const selfEmploymentTax = this.calculateSelfEmploymentTax(selfEmploymentIncome);
    const federalTaxOwed = this.calculateFederalIncomeTax(adjustedGrossIncome, user.taxInfo.filingStatus);
    const stateTaxOwed = this.calculateStateTax(adjustedGrossIncome, user.taxInfo.state, user.taxInfo.stateTaxRate);

    const totalTaxOwed = federalTaxOwed + stateTaxOwed + selfEmploymentTax;
    const estimatedQuarterlyPayment = quarter ? 
      this.calculateAnnualTaxLiability(adjustedGrossIncome * (4 / quarter), user) / 4 : 
      totalTaxOwed / 4;

    const taxJarAmount = this.calculateTaxJarRecommendation(incomeData.totalIncome, totalTaxOwed, quarter);
    const recommendations = await this.generateRecommendations(userId, incomeData, expenseData, totalTaxOwed, year, quarter);

    const taxCalculation = new TaxCalculation({
      user: userId,
      period: { year, quarter },
      income: incomeData,
      expenses: expenseData,
      taxCalculations: {
        adjustedGrossIncome,
        selfEmploymentIncome,
        federalTaxOwed,
        stateTaxOwed,
        selfEmploymentTax,
        totalTaxOwed,
        estimatedQuarterlyPayment
      },
      recommendations: {
        taxJarAmount,
        nextQuarterlyDue: this.getNextQuarterlyDueDate(),
        suggestedDeductions: recommendations.suggestedDeductions,
        taxStrategy: recommendations.taxStrategy
      }
    });

    await taxCalculation.save();
    return taxCalculation;
  }

  // Indian Tax Calculation
  async calculateIndianTaxes(userId, incomeData, expenseData, year, quarter, user) {
    const grossIncome = incomeData.businessIncome;
    const businessExpenses = expenseData.deductibleExpenses;
    const netIncome = grossIncome - businessExpenses;
    
    const presumptiveTax = user.taxInfo.presumptiveTaxation && grossIncome <= 5000000;
    
    let taxableIncome;
    let incomeTaxCalc;
    
    if (presumptiveTax) {
      const presumptiveResult = this.calculateIndianPresumptiveTax(grossIncome);
      taxableIncome = presumptiveResult.presumptiveProfit;
      incomeTaxCalc = presumptiveResult.taxCalculation;
    } else {
      taxableIncome = Math.max(0, netIncome);
      const deductions = {
        section80C: Math.min(user.taxInfo.section80C || 0, 150000),
        section80D: Math.min(user.taxInfo.section80D || 0, 25000),
        section80E: user.taxInfo.section80E || 0
      };
      incomeTaxCalc = this.calculateIndianIncomeTax(taxableIncome, user.taxInfo.taxRegime, deductions);
    }

    const gstCalc = this.calculateIndianGST(grossIncome, 'digitalServices');
    const professionalTax = Math.min(2500, grossIncome * 0.001);
    const totalTaxOwed = incomeTaxCalc.totalTax + gstCalc.gstAmount + professionalTax;
    const estimatedQuarterlyPayment = totalTaxOwed / 4;
    const taxJarAmount = grossIncome * 0.30;

    const recommendations = {
      taxJarAmount,
      nextQuarterlyDue: this.getNextQuarterlyDueDate(),
      suggestedDeductions: [
        'Maximize Section 80C deductions (₹1.5 lakh)',
        'Claim home office and equipment expenses',
        'Keep GST input credit receipts'
      ],
      taxStrategy: presumptiveTax ? 'Presumptive Taxation (Section 44ADA)' : 'Regular Business Taxation',
      gstAdvice: gstCalc.message
    };

    const taxCalculation = new TaxCalculation({
      user: userId,
      period: { year, quarter },
      income: incomeData,
      expenses: expenseData,
      taxCalculations: {
        adjustedGrossIncome: taxableIncome,
        selfEmploymentIncome: taxableIncome,
        federalTaxOwed: incomeTaxCalc.incomeTax,
        stateTaxOwed: professionalTax,
        selfEmploymentTax: gstCalc.gstAmount,
        totalTaxOwed,
        estimatedQuarterlyPayment,
        gstAmount: gstCalc.gstAmount,
        cessAmount: incomeTaxCalc.cess,
        taxRegime: user.taxInfo.taxRegime,
        presumptiveTaxation: presumptiveTax
      },
      recommendations
    });

    await taxCalculation.save();
    return taxCalculation;
  }

  // Calculate Indian income tax
  calculateIndianIncomeTax(income, regime = 'new', deductions = {}) {
    const brackets = regime === 'new' ? this.indianTaxBrackets : this.indianTaxBracketsOld;
    let tax = 0;
    let effectiveIncome = income;

    if (regime === 'old') {
      const totalDeductions = Math.min(
        (deductions.section80C || 0) + 
        (deductions.section80D || 0) + 
        (deductions.section80E || 0) + 
        (deductions.other || 0),
        income
      );
      effectiveIncome = Math.max(0, income - totalDeductions);
    } else {
      effectiveIncome = Math.max(0, income - this.indianStandardDeduction);
    }

    for (const bracket of brackets) {
      if (effectiveIncome > bracket.min) {
        const taxableInThisBracket = Math.min(effectiveIncome - bracket.min, bracket.max - bracket.min);
        tax += taxableInThisBracket * bracket.rate;
      }
    }

    const cess = tax * 0.04;
    return {
      incomeTax: tax,
      cess: cess,
      totalTax: tax + cess,
      effectiveRate: effectiveIncome > 0 ? (tax + cess) / effectiveIncome : 0,
      regime: regime
    };
  }

  // Calculate GST for Indian creators
  calculateIndianGST(income, serviceType = 'digitalServices') {
    const gstThreshold = 2000000;
    
    if (income <= gstThreshold) {
      return {
        gstRequired: false,
        gstAmount: 0,
        rate: 0,
        message: 'GST registration not required (under ₹20 lakh threshold)'
      };
    }

    const gstRate = this.indianGSTRates[serviceType] || this.indianGSTRates.digitalServices;
    const gstAmount = income * gstRate;

    return {
      gstRequired: true,
      gstAmount: gstAmount,
      rate: gstRate,
      serviceType: serviceType,
      message: `GST applicable at ${(gstRate * 100)}% on income above ₹20 lakh`
    };
  }

  // Calculate presumptive taxation for Indian digital creators
  calculateIndianPresumptiveTax(grossIncome, serviceType = 'digitalServices') {
    const rules = this.indianCreatorTaxRules.presumptiveBusinessIncome;
    
    if (grossIncome > rules.threshold) {
      return {
        applicable: false,
        message: 'Income exceeds ₹50 lakh threshold for presumptive taxation'
      };
    }

    const presumptiveProfit = grossIncome * rules.digitalServices;
    const taxCalculation = this.calculateIndianIncomeTax(presumptiveProfit, 'new');

    return {
      applicable: true,
      grossIncome: grossIncome,
      presumptiveProfit: presumptiveProfit,
      profitRate: rules.digitalServices,
      taxCalculation: taxCalculation,
      message: `Under Section 44ADA: ${(rules.digitalServices * 100)}% of income treated as profit`
    };
  }

  // Rest of the helper methods (keeping existing US-focused ones and adding multi-country support)
  async calculateIncome(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'income'
    });

    let totalIncome = 0;
    let businessIncome = 0;
    let otherIncome = 0;

    transactions.forEach(transaction => {
      totalIncome += Math.abs(transaction.amount);
      if (transaction.category && 
          ['freelance', 'youtube', 'twitch', 'patreon', 'sponsorship', 'affiliate'].includes(
            transaction.category.toLowerCase()
          )) {
        businessIncome += Math.abs(transaction.amount);
      } else {
        otherIncome += Math.abs(transaction.amount);
      }
    });

    return {
      totalIncome,
      businessIncome,
      otherIncome,
      transactionCount: transactions.length
    };
  }

  async calculateExpenses(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
      type: 'expense'
    });

    let totalExpenses = 0;
    let deductibleExpenses = 0;
    let personalExpenses = 0;

    transactions.forEach(transaction => {
      const amount = Math.abs(transaction.amount);
      totalExpenses += amount;

      if (transaction.category && 
          ['office_supplies', 'software', 'equipment', 'travel', 'meals', 'education', 'marketing'].includes(
            transaction.category.toLowerCase()
          )) {
        deductibleExpenses += amount;
      } else {
        personalExpenses += amount;
      }
    });

    return {
      totalExpenses,
      deductibleExpenses,
      personalExpenses,
      transactionCount: transactions.length
    };
  }

  calculateSelfEmploymentTax(selfEmploymentIncome) {
    if (selfEmploymentIncome <= 0) return 0;

    let tax = selfEmploymentIncome * this.selfEmploymentTaxRate;
    
    if (selfEmploymentIncome > this.additionalMedicareTaxThreshold) {
      const additionalMedicareIncome = selfEmploymentIncome - this.additionalMedicareTaxThreshold;
      tax += additionalMedicareIncome * this.additionalMedicareTaxRate;
    }

    return tax;
  }

  calculateFederalIncomeTax(adjustedGrossIncome, filingStatus) {
    if (adjustedGrossIncome <= 0) return 0;

    const brackets = filingStatus === 'married_joint' ? 
      this.federalTaxBracketsMarried : this.federalTaxBrackets;
    
    const standardDeduction = this.standardDeductions[filingStatus] || this.standardDeductions.single;
    const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

    let tax = 0;
    for (const bracket of brackets) {
      if (taxableIncome > bracket.min) {
        const taxableInThisBracket = Math.min(taxableIncome - bracket.min, bracket.max - bracket.min);
        tax += taxableInThisBracket * bracket.rate;
      }
    }

    return tax;
  }

  getStateTaxRate(state) {
    return this.stateTaxRates[state] || 0.05;
  }

  calculateStateTax(adjustedGrossIncome, state, customRate = null) {
    if (adjustedGrossIncome <= 0) return 0;
    
    const taxRate = customRate || this.getStateTaxRate(state);
    return adjustedGrossIncome * taxRate;
  }

  calculateAnnualTaxLiability(annualIncome, user) {
    const federalTax = this.calculateFederalIncomeTax(annualIncome, user.taxInfo.filingStatus);
    const stateTax = this.calculateStateTax(annualIncome, user.taxInfo.state);
    const selfEmploymentTax = this.calculateSelfEmploymentTax(annualIncome);
    
    return federalTax + stateTax + selfEmploymentTax;
  }

  calculateTaxJarRecommendation(totalIncome, totalTaxOwed, quarter) {
    const baseRecommendation = totalTaxOwed * 1.1;
    
    if (quarter) {
      const annualizedTaxOwed = totalTaxOwed * (4 / quarter);
      return annualizedTaxOwed * 1.1;
    }
    
    return Math.max(baseRecommendation, totalIncome * 0.25);
  }

  getNextQuarterlyDueDate() {
    const now = new Date();
    const year = now.getFullYear();
    const quarterDueDates = [
      new Date(year, 3, 15),  // Q1 - April 15
      new Date(year, 5, 15),  // Q2 - June 15
      new Date(year, 8, 15),  // Q3 - September 15
      new Date(year + 1, 0, 15)  // Q4 - January 15 next year
    ];

    return quarterDueDates.find(date => date > now) || quarterDueDates[0];
  }

  async generateRecommendations(userId, incomeData, expenseData, totalTaxOwed, year, quarter) {
    const suggestions = [];
    
    if (expenseData.deductibleExpenses < incomeData.businessIncome * 0.15) {
      suggestions.push('Consider tracking more business expenses - you may be missing deductions');
    }
    
    if (totalTaxOwed > incomeData.businessIncome * 0.30) {
      suggestions.push('High tax burden detected - consider consulting a tax professional');
    }
    
    suggestions.push('Set up a dedicated business bank account for better expense tracking');
    
    return {
      suggestedDeductions: suggestions,
      taxStrategy: incomeData.businessIncome > 100000 ? 
        'Consider entity election (LLC/S-Corp) for tax optimization' : 
        'Focus on maximizing business deductions'
    };
  }

  async calculateRealTimeTaxJar(userId, newTransactionAmount, transactionType) {
    const currentYear = new Date().getFullYear();
    const currentTaxCalc = await TaxCalculation.findOne({
      user: userId,
      'period.year': currentYear,
      'period.quarter': { $exists: false }
    }).sort({ calculatedAt: -1 });

    if (!currentTaxCalc) {
      const defaultTaxRate = 0.25;
      return {
        amountToSetAside: Math.abs(newTransactionAmount) * defaultTaxRate,
        taxRate: defaultTaxRate,
        message: `Set aside $${(Math.abs(newTransactionAmount) * defaultTaxRate).toFixed(2)} for taxes`
      };
    }

    const taxRate = currentTaxCalc.income.businessIncome > 0 ? 
      currentTaxCalc.taxCalculations.totalTaxOwed / currentTaxCalc.income.businessIncome : 0.25;

    const amountToSetAside = transactionType === 'income' ? 
      Math.abs(newTransactionAmount) * taxRate : 0;

    return {
      amountToSetAside,
      taxRate,
      totalTaxJar: currentTaxCalc.recommendations.taxJarAmount + amountToSetAside,
      message: `Set aside $${amountToSetAside.toFixed(2)} from this $${Math.abs(newTransactionAmount).toFixed(2)} payment for taxes`
    };
  }

  calculateHomeOfficeDeduction(homeOfficeSquareFeet, totalHomeSquareFeet) {
    const rules = this.creatorTaxRules.homeOfficeDeduction;
    const percentage = Math.min(homeOfficeSquareFeet / totalHomeSquareFeet, 1);
    const simplifiedDeduction = Math.min(homeOfficeSquareFeet * rules.perSquareFootDeduction, rules.maxDeduction);
    
    return {
      simplifiedMethod: simplifiedDeduction,
      percentage: percentage,
      recommendation: simplifiedDeduction > 0 ? 
        `You could deduct $${simplifiedDeduction} using the simplified home office method.` : 
        'Consider setting up a dedicated home office space for tax deductions.'
    };
  }

  getIndianCreatorTaxTips(incomeLevel, country = 'IN') {
    const tips = [];
    
    if (incomeLevel > 300000) {
      tips.push("Consider choosing between new tax regime (no deductions) vs old regime (with deductions)");
    }
    
    if (incomeLevel > 2000000) {
      tips.push("GST registration required - you need to charge 18% GST on your services");
      tips.push("File GST returns monthly and pay GST by 20th of next month");
    }
    
    if (incomeLevel < 5000000) {
      tips.push("You can opt for presumptive taxation (Section 44ADA) - 50% of income treated as profit");
    }
    
    tips.push("Keep invoices for all business expenses - equipment, internet, phone bills");
    tips.push("Claim home office expenses and equipment depreciation");
    tips.push("Consider professional tax (₹2,500/year) and other state-specific taxes");
    
    if (incomeLevel > 1000000) {
      tips.push("You may need to pay advance tax quarterly to avoid interest");
      tips.push("Consider maximizing Section 80C deductions (₹1.5 lakh) if using old tax regime");
    }

    return tips;
  }

  convertCurrency(amount, fromCurrency, toCurrency) {
    const exchangeRates = {
      'USD_INR': 83.0,
      'INR_USD': 1/83.0
    };
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = exchangeRates[rateKey] || 1;
    
    return amount * rate;
  }

  getCreatorTaxTips(incomeLevel, expenseLevel, country = 'US') {
    if (country === 'IN') {
      return this.getIndianCreatorTaxTips(incomeLevel);
    }
    
    const tips = [];
    
    if (incomeLevel > 50000) {
      tips.push("Consider making quarterly estimated tax payments to avoid penalties");
      tips.push("Track all business expenses - they add up quickly for creators");
    }
    
    if (expenseLevel < incomeLevel * 0.15) {
      tips.push("You might be missing deductible expenses. Common ones: equipment, software, internet, phone");
    }
    
    tips.push("Keep receipts for all business purchases - apps like Expensify can help");
    tips.push("Consider a dedicated business bank account for cleaner bookkeeping");
    
    if (incomeLevel > 100000) {
      tips.push("You might benefit from forming an LLC or S-Corp - consult a tax professional");
    }

    return tips;
  }
}

module.exports = new TaxCalculationService();
