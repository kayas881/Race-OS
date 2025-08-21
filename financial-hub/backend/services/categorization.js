const natural = require('natural');
const compromise = require('compromise');

class CategorizationService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    
    // Pre-defined categories for creators and freelancers
    this.categories = {
      // Income categories
      income: {
        'ad_revenue': {
          keywords: ['youtube', 'adsense', 'ad revenue', 'monetization', 'cpm', 'rpm'],
          platforms: ['youtube', 'twitch'],
          confidence: 0.9
        },
        'sponsorship': {
          keywords: ['sponsor', 'brand deal', 'partnership', 'collaboration', 'promotional'],
          confidence: 0.8
        },
        'subscription': {
          keywords: ['patreon', 'substack', 'twitch prime', 'membership', 'subscriber'],
          platforms: ['patreon', 'substack', 'twitch'],
          confidence: 0.9
        },
        'donation': {
          keywords: ['donation', 'tip', 'super chat', 'bits', 'cheer', 'streamlabs'],
          platforms: ['twitch', 'youtube'],
          confidence: 0.8
        },
        'merchandise': {
          keywords: ['merch', 'teespring', 'printful', 'shopify', 'store sales'],
          confidence: 0.7
        },
        'affiliate': {
          keywords: ['affiliate', 'commission', 'amazon associates', 'referral'],
          confidence: 0.7
        }
      },
      
      // Business expense categories
      business_expenses: {
        'equipment': {
          keywords: ['camera', 'microphone', 'lighting', 'computer', 'laptop', 'monitor', 'audio', 'video', 'gaming', 'console', 'capture card'],
          taxDeductible: true,
          confidence: 0.8
        },
        'software': {
          keywords: ['adobe', 'photoshop', 'premiere', 'after effects', 'obs', 'streamlabs', 'canva', 'figma', 'software', 'subscription', 'saas'],
          taxDeductible: true,
          confidence: 0.9
        },
        'internet_phone': {
          keywords: ['internet', 'wifi', 'broadband', 'phone', 'mobile', 'cellular', 'data plan'],
          taxDeductible: true,
          confidence: 0.7
        },
        'office_supplies': {
          keywords: ['office', 'desk', 'chair', 'supplies', 'stationary', 'notebook', 'pen'],
          taxDeductible: true,
          confidence: 0.6
        },
        'marketing': {
          keywords: ['advertising', 'facebook ads', 'google ads', 'promotion', 'marketing', 'social media'],
          taxDeductible: true,
          confidence: 0.8
        },
        'education': {
          keywords: ['course', 'tutorial', 'training', 'conference', 'workshop', 'udemy', 'skillshare'],
          taxDeductible: true,
          confidence: 0.7
        },
        'travel': {
          keywords: ['travel', 'flight', 'hotel', 'uber', 'lyft', 'taxi', 'conference', 'event'],
          taxDeductible: true,
          confidence: 0.6
        },
        'meals': {
          keywords: ['restaurant', 'food', 'coffee', 'lunch', 'dinner', 'business meal'],
          taxDeductible: true,
          deductionPercentage: 0.5, // 50% deductible for business meals
          confidence: 0.5
        }
      },
      
      // Personal categories
      personal: {
        'groceries': {
          keywords: ['grocery', 'supermarket', 'walmart', 'target', 'costco', 'food'],
          confidence: 0.7
        },
        'utilities': {
          keywords: ['electric', 'gas', 'water', 'utility', 'energy'],
          confidence: 0.8
        },
        'rent_mortgage': {
          keywords: ['rent', 'mortgage', 'housing', 'apartment'],
          confidence: 0.9
        },
        'personal_care': {
          keywords: ['haircut', 'salon', 'spa', 'personal care', 'beauty'],
          confidence: 0.6
        }
      }
    };
  }

  async categorizeTransaction(transactionData) {
    const { description, merchantName, amount, type, categories: plaidCategories } = transactionData;
    
    // Normalize text for analysis
    const text = this.normalizeText(`${description} ${merchantName || ''}`);
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stems = tokens.map(token => this.stemmer.stem(token));
    
    let bestMatch = {
      category: { primary: 'other', detailed: 'uncategorized', confidence: 0 },
      businessClassification: 'unknown',
      taxDeductible: { isDeductible: false, confidence: 0 }
    };

    // Determine if transaction is income or expense based on type and amount
    const transactionType = type || (amount > 0 ? 'expense' : 'income');
    
    // Search through appropriate categories
    const categoryGroups = transactionType === 'income' 
      ? [this.categories.income] 
      : [this.categories.business_expenses, this.categories.personal];

    for (const categoryGroup of categoryGroups) {
      for (const [categoryName, categoryData] of Object.entries(categoryGroup)) {
        const confidence = this.calculateConfidence(tokens, stems, categoryData);
        
        if (confidence > bestMatch.category.confidence) {
          bestMatch.category = {
            primary: categoryName,
            detailed: categoryName,
            confidence: confidence
          };
          
          // Determine business classification
          if (categoryGroup === this.categories.business_expenses || categoryGroup === this.categories.income) {
            bestMatch.businessClassification = 'business';
          } else {
            bestMatch.businessClassification = 'personal';
          }
          
          // Set tax deductibility
          if (categoryData.taxDeductible) {
            bestMatch.taxDeductible = {
              isDeductible: true,
              deductionType: this.mapCategoryToDeductionType(categoryName),
              confidence: confidence,
              deductionPercentage: categoryData.deductionPercentage || 1.0
            };
          }
        }
      }
    }

    // Use Plaid categories as fallback if confidence is low
    if (bestMatch.category.confidence < 0.5 && plaidCategories && plaidCategories.length > 0) {
      bestMatch.category.primary = plaidCategories[0].toLowerCase().replace(' ', '_');
      bestMatch.category.detailed = plaidCategories.join(', ');
      bestMatch.category.confidence = 0.3;
    }

    // Apply creator-specific business rules
    bestMatch = this.applyCreatorBusinessRules(bestMatch, text, transactionType);

    return bestMatch;
  }

  normalizeText(text) {
    // Remove special characters and normalize spaces
    return text.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  calculateConfidence(tokens, stems, categoryData) {
    let matchCount = 0;
    let totalKeywords = categoryData.keywords.length;
    
    for (const keyword of categoryData.keywords) {
      const keywordTokens = this.tokenizer.tokenize(keyword.toLowerCase());
      const keywordStems = keywordTokens.map(token => this.stemmer.stem(token));
      
      // Check for exact keyword match
      if (tokens.some(token => keyword.toLowerCase().includes(token))) {
        matchCount += 1;
      }
      // Check for stemmed match
      else if (stems.some(stem => keywordStems.includes(stem))) {
        matchCount += 0.7;
      }
    }
    
    let confidence = (matchCount / totalKeywords) * (categoryData.confidence || 0.5);
    
    // Boost confidence for exact matches
    if (matchCount > 0) {
      confidence = Math.min(confidence * 1.2, 1.0);
    }
    
    return confidence;
  }

  mapCategoryToDeductionType(category) {
    const mapping = {
      'equipment': 'equipment',
      'software': 'software',
      'internet_phone': 'business_expense',
      'office_supplies': 'office_supplies',
      'marketing': 'marketing',
      'education': 'business_expense',
      'travel': 'travel',
      'meals': 'meals'
    };
    
    return mapping[category] || 'other';
  }

  applyCreatorBusinessRules(categorization, text, transactionType) {
    // Creator-specific patterns
    const creatorPatterns = [
      { pattern: /youtube|adsense|google/, business: true },
      { pattern: /twitch|streamlabs|obs/, business: true },
      { pattern: /patreon|substack/, business: true },
      { pattern: /adobe|premiere|photoshop|after effects/, business: true, deductible: true },
      { pattern: /camera|microphone|lighting|audio|video/, business: true, deductible: true },
      { pattern: /gaming|console|capture card/, business: true, deductible: true }
    ];

    for (const rule of creatorPatterns) {
      if (rule.pattern.test(text.toLowerCase())) {
        if (rule.business) {
          categorization.businessClassification = 'business';
        }
        if (rule.deductible && transactionType === 'expense') {
          categorization.taxDeductible.isDeductible = true;
          categorization.taxDeductible.confidence = Math.max(
            categorization.taxDeductible.confidence, 
            0.8
          );
        }
        break;
      }
    }

    return categorization;
  }

  async trainModel(transactions) {
    // TODO: Implement machine learning training with historical data
    // This would use the transaction history to improve categorization accuracy
    console.log('Training categorization model with', transactions.length, 'transactions');
  }

  async suggestCategories(description, limit = 5) {
    const text = this.normalizeText(description);
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const stems = tokens.map(token => this.stemmer.stem(token));
    
    const suggestions = [];
    
    // Check all categories
    const allCategories = {
      ...this.categories.income,
      ...this.categories.business_expenses,
      ...this.categories.personal
    };
    
    for (const [categoryName, categoryData] of Object.entries(allCategories)) {
      const confidence = this.calculateConfidence(tokens, stems, categoryData);
      if (confidence > 0.1) {
        suggestions.push({
          category: categoryName,
          confidence: confidence,
          taxDeductible: categoryData.taxDeductible || false
        });
      }
    }
    
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

module.exports = new CategorizationService();
