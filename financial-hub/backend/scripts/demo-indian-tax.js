const TaxCalculationService = require('../services/taxCalculation');

// Demo: Indian Tax Calculations for Content Creators
async function demonstrateIndianTaxCalculations() {
  console.log('🇮🇳 INDIAN TAX CALCULATIONS FOR CONTENT CREATORS\n');
  console.log('=' .repeat(60));

  // Test different income levels for Indian creators
  const testIncomes = [
    { amount: 500000, description: '₹5 lakh YouTube income' },
    { amount: 1500000, description: '₹15 lakh multi-platform income' },
    { amount: 3000000, description: '₹30 lakh successful creator income' },
    { amount: 6000000, description: '₹60 lakh top-tier creator income' }
  ];

  for (const income of testIncomes) {
    console.log(`\n📊 ${income.description}:`);
    console.log('-'.repeat(40));

    // New Tax Regime Calculation
    const newRegimeTax = TaxCalculationService.calculateIndianIncomeTax(income.amount, 'new');
    console.log(`New Tax Regime: ₹${newRegimeTax.totalTax.toLocaleString('en-IN')} (${(newRegimeTax.effectiveRate * 100).toFixed(1)}%)`);

    // Old Tax Regime with deductions
    const deductions = {
      section80C: Math.min(150000, income.amount * 0.1), // 10% savings up to ₹1.5L
      section80D: 25000, // Health insurance
      section80E: Math.min(50000, income.amount * 0.02) // Education loan interest
    };
    const oldRegimeTax = TaxCalculationService.calculateIndianIncomeTax(income.amount, 'old', deductions);
    console.log(`Old Tax Regime: ₹${oldRegimeTax.totalTax.toLocaleString('en-IN')} (${(oldRegimeTax.effectiveRate * 100).toFixed(1)}%) with deductions`);

    // GST Calculation
    const gstCalc = TaxCalculationService.calculateIndianGST(income.amount, 'digitalServices');
    if (gstCalc.gstRequired) {
      console.log(`GST Required: ₹${gstCalc.gstAmount.toLocaleString('en-IN')} (${(gstCalc.rate * 100)}%)`);
    } else {
      console.log(`GST: ${gstCalc.message}`);
    }

    // Presumptive Taxation (Section 44ADA)
    if (income.amount <= 5000000) {
      const presumptive = TaxCalculationService.calculateIndianPresumptiveTax(income.amount);
      console.log(`Presumptive Tax (44ADA): ₹${presumptive.taxCalculation.totalTax.toLocaleString('en-IN')} on ₹${presumptive.presumptiveProfit.toLocaleString('en-IN')} profit`);
    }

    // Tax Tips
    const tips = TaxCalculationService.getIndianCreatorTaxTips(income.amount);
    console.log('💡 Tax Tips:');
    tips.slice(0, 3).forEach(tip => console.log(`   • ${tip}`));
  }

  console.log('\n🔍 INDIAN TAX FEATURES COMPARISON:');
  console.log('=' .repeat(60));
  console.log('✅ Income Tax: New regime (simple) vs Old regime (with deductions)');
  console.log('✅ GST: 18% on digital services above ₹20 lakh annual income');
  console.log('✅ Presumptive Taxation: Section 44ADA for income under ₹50 lakh');
  console.log('✅ Professional Tax: State-specific (typically ₹2,500/year)');
  console.log('✅ TDS: 10% on professional services above ₹30,000');
  console.log('✅ Advance Tax: Quarterly payments for income above ₹10,000 tax liability');

  console.log('\n💰 CREATOR-SPECIFIC DEDUCTIONS (OLD REGIME):');
  console.log('=' .repeat(60));
  console.log('• Section 80C: ₹1.5 lakh (PF, insurance, tax-saving FDs)');
  console.log('• Section 80D: ₹25,000 health insurance (₹50,000 if 60+)');
  console.log('• Section 80E: Education loan interest (no limit)');
  console.log('• Home Office: Equipment depreciation (60% on computers/cameras)');
  console.log('• Business Expenses: Internet, phone, software subscriptions');
  console.log('• Professional Development: Courses, books, conferences');

  console.log('\n🌏 MULTI-COUNTRY FEATURES:');
  console.log('=' .repeat(60));
  console.log('• Supports both US and Indian tax systems');
  console.log('• Currency conversion (USD ↔ INR)');
  console.log('• Country-specific creator deductions');
  console.log('• Real-time tax jar calculations');
  console.log('• No external API dependencies');
  console.log('• Cost: $0 (vs $50-200/month for tax APIs)');
}

// Run the demonstration
demonstrateIndianTaxCalculations().catch(console.error);
