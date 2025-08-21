const TaxCalculationService = require('../services/taxCalculation');

// Demo: US vs Indian Tax System Comparison
async function compareUSandIndianTaxes() {
  console.log('🌍 US vs INDIAN TAX SYSTEM COMPARISON FOR CREATORS\n');
  console.log('=' .repeat(70));

  // Convert ₹30 lakh to USD (approximately $36,000)
  const indianIncome = 3000000; // ₹30 lakh
  const usIncome = TaxCalculationService.convertCurrency(indianIncome, 'INR', 'USD');

  console.log(`📊 INCOME COMPARISON:`);
  console.log(`Indian Creator: ₹${indianIncome.toLocaleString('en-IN')} per year`);
  console.log(`US Creator: $${Math.round(usIncome).toLocaleString('en-US')} per year (equivalent)\n`);

  // Indian Tax Calculation
  console.log('🇮🇳 INDIAN TAX BREAKDOWN:');
  console.log('-'.repeat(40));
  
  const indianNewTax = TaxCalculationService.calculateIndianIncomeTax(indianIncome, 'new');
  const indianGST = TaxCalculationService.calculateIndianGST(indianIncome, 'digitalServices');
  const indianPresumptive = TaxCalculationService.calculateIndianPresumptiveTax(indianIncome);
  
  console.log(`Income Tax (New Regime): ₹${indianNewTax.totalTax.toLocaleString('en-IN')} (${(indianNewTax.effectiveRate * 100).toFixed(1)}%)`);
  console.log(`GST (18%): ₹${indianGST.gstAmount.toLocaleString('en-IN')}`);
  console.log(`Professional Tax: ₹2,500`);
  console.log(`Total Tax: ₹${(indianNewTax.totalTax + indianGST.gstAmount + 2500).toLocaleString('en-IN')}`);
  console.log(`\nWith Presumptive Taxation (44ADA):`);
  console.log(`Income Tax: ₹${indianPresumptive.taxCalculation.totalTax.toLocaleString('en-IN')} (on 50% profit)`);
  console.log(`Total Tax: ₹${(indianPresumptive.taxCalculation.totalTax + indianGST.gstAmount + 2500).toLocaleString('en-IN')}`);

  // US Tax Calculation  
  console.log('\n🇺🇸 US TAX BREAKDOWN:');
  console.log('-'.repeat(40));
  
  const usFederalTax = TaxCalculationService.calculateFederalIncomeTax(usIncome, 'single');
  const usStateTax = TaxCalculationService.calculateStateTax(usIncome, 'CA', 0.093); // California
  const usSelfEmploymentTax = TaxCalculationService.calculateSelfEmploymentTax(usIncome);
  
  console.log(`Federal Income Tax: $${Math.round(usFederalTax).toLocaleString('en-US')}`);
  console.log(`State Tax (CA): $${Math.round(usStateTax).toLocaleString('en-US')}`);
  console.log(`Self-Employment Tax: $${Math.round(usSelfEmploymentTax).toLocaleString('en-US')}`);
  console.log(`Total Tax: $${Math.round(usFederalTax + usStateTax + usSelfEmploymentTax).toLocaleString('en-US')}`);

  // Tax Tips Comparison
  console.log('\n💡 TAX TIPS COMPARISON:');
  console.log('=' .repeat(70));
  
  const indianTips = TaxCalculationService.getCreatorTaxTips(indianIncome, 0, 'IN');
  const usTips = TaxCalculationService.getCreatorTaxTips(usIncome, 0, 'US');
  
  console.log('🇮🇳 Indian Creator Tips:');
  indianTips.slice(0, 4).forEach(tip => console.log(`   • ${tip}`));
  
  console.log('\n🇺🇸 US Creator Tips:');
  usTips.slice(0, 4).forEach(tip => console.log(`   • ${tip}`));

  console.log('\n🔧 SYSTEM FEATURES:');
  console.log('=' .repeat(70));
  console.log('✅ Both countries supported in same application');
  console.log('✅ Automatic currency conversion');
  console.log('✅ Country-specific tax brackets and rates');
  console.log('✅ Creator-focused deductions for both regions');
  console.log('✅ Real-time tax jar calculations');
  console.log('✅ Quarterly/advance tax payment calculations');
  console.log('✅ No external API dependencies - all built-in');
  console.log('✅ Zero ongoing costs (saves $50-200/month vs tax APIs)');

  console.log('\n🎯 KEY DIFFERENCES:');
  console.log('=' .repeat(70));
  console.log('US System:');
  console.log('• Progressive federal + state tax');
  console.log('• Self-employment tax (14.13%)');
  console.log('• Standard deductions by filing status');
  console.log('• Business expense deductions');
  
  console.log('\nIndian System:');
  console.log('• Choose between new (simple) or old (deductions) regime');
  console.log('• GST registration required above ₹20 lakh');
  console.log('• Presumptive taxation option (Section 44ADA)');
  console.log('• Professional tax varies by state');
}

// Run the comparison
compareUSandIndianTaxes().catch(console.error);
