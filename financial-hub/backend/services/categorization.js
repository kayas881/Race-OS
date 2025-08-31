const natural = require('natural');
const compromise = require('compromise');
const CategorizationTraining = require('../models/CategorizationTraining');

class CategorizationService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.classifier = new natural.BayesClassifier();
    this.isModelTrained = false;
    this.userModels = new Map(); // Store user-specific models
    
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

  async categorizeTransaction(transactionData, userId = null) {
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

    // Try user-specific ML model first if available
    if (userId && this.userModels.has(userId)) {
      const userModel = this.userModels.get(userId);
      const mlPrediction = await this.predictWithUserModel(userModel, text, tokens, stems);
      if (mlPrediction.confidence > 0.6) {
        bestMatch = mlPrediction;
      }
    }

    // Fall back to rule-based categorization if ML confidence is low
    if (bestMatch.category.confidence < 0.6) {
      bestMatch = await this.ruleBasedCategorization(tokens, stems, type, plaidCategories);
    }

    // Use Plaid categories as fallback if confidence is still low
    if (bestMatch.category.confidence < 0.5 && plaidCategories && plaidCategories.length > 0) {
      bestMatch.category.primary = plaidCategories[0].toLowerCase().replace(' ', '_');
      bestMatch.category.detailed = plaidCategories.join(', ');
      bestMatch.category.confidence = 0.3;
    }

    // Apply creator-specific business rules
    bestMatch = this.applyCreatorBusinessRules(bestMatch, text, type);

    return bestMatch;
  }

  async ruleBasedCategorization(tokens, stems, type, plaidCategories) {
    // Original rule-based logic
    let bestMatch = {
      category: { primary: 'other', detailed: 'uncategorized', confidence: 0 },
      businessClassification: 'unknown',
      taxDeductible: { isDeductible: false, confidence: 0 }
    };

    // Determine if transaction is income or expense based on type and amount
    const transactionType = type || 'expense';
    
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

  async trainModel(userId) {
    try {
      console.log('Training categorization model for user:', userId);
      
      // Get user's training data
      const trainingData = await CategorizationTraining.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(1000); // Use last 1000 corrections
      
      if (trainingData.length < 10) {
        console.log('Insufficient training data for user:', userId);
        return false;
      }

      // Create user-specific classifier
      const userClassifier = new natural.BayesClassifier();
      
      // Train the classifier
      for (const training of trainingData) {
        const features = this.extractFeatures(training.transactionData);
        const label = `${training.userClassification.category.primary}|${training.userClassification.businessClassification}|${training.userClassification.taxDeductible.isDeductible}`;
        
        userClassifier.addDocument(features, label);
      }
      
      userClassifier.train();
      
      // Store the trained model
      this.userModels.set(userId, {
        classifier: userClassifier,
        trainingCount: trainingData.length,
        lastTrained: new Date()
      });
      
      console.log(`Successfully trained model for user ${userId} with ${trainingData.length} examples`);
      return true;
      
    } catch (error) {
      console.error('Error training categorization model:', error);
      return false;
    }
  }

  async predictWithUserModel(userModel, text, tokens, stems) {
    try {
      const features = tokens.join(' ');
      const prediction = userModel.classifier.classify(features);
      const confidence = userModel.classifier.getClassifications(features)[0].value;
      
      // Parse the prediction
      const [primary, businessClassification, taxDeductible] = prediction.split('|');
      
      return {
        category: {
          primary: primary,
          detailed: primary,
          confidence: confidence
        },
        businessClassification: businessClassification,
        taxDeductible: {
          isDeductible: taxDeductible === 'true',
          confidence: confidence
        }
      };
    } catch (error) {
      console.error('Error predicting with user model:', error);
      return {
        category: { primary: 'other', detailed: 'uncategorized', confidence: 0 },
        businessClassification: 'unknown',
        taxDeductible: { isDeductible: false, confidence: 0 }
      };
    }
  }

  extractFeatures(transactionData) {
    const text = this.normalizeText(`${transactionData.description} ${transactionData.merchantName || ''}`);
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    return tokens.join(' ');
  }

  async recordUserCorrection(userId, originalTransaction, userCorrection, systemPrediction) {
    try {
      // Determine correction type
      let correctionType = 'new_classification';
      if (systemPrediction.category.primary !== userCorrection.category.primary) {
        correctionType = 'category_correction';
      } else if (systemPrediction.businessClassification !== userCorrection.businessClassification) {
        correctionType = 'business_classification_correction';
      } else if (systemPrediction.taxDeductible.isDeductible !== userCorrection.taxDeductible.isDeductible) {
        correctionType = 'tax_deductible_correction';
      }

      // Extract features
      const text = this.normalizeText(`${originalTransaction.description} ${originalTransaction.merchantName || ''}`);
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      const stems = tokens.map(token => this.stemmer.stem(token));
      
      const training = new CategorizationTraining({
        user: userId,
        transactionData: {
          description: originalTransaction.description,
          merchantName: originalTransaction.merchantName,
          amount: originalTransaction.amount,
          type: originalTransaction.type
        },
        userClassification: userCorrection,
        systemPrediction: systemPrediction,
        correctionType: correctionType,
        features: {
          keywords: tokens,
          stems: stems,
          patterns: this.extractPatterns(text),
          merchant_type: this.detectMerchantType(originalTransaction.merchantName),
          amount_range: this.categorizeAmount(originalTransaction.amount)
        }
      });

      await training.save();
      
      // Retrain model if we have enough corrections
      const correctionCount = await CategorizationTraining.countDocuments({ user: userId });
      if (correctionCount % 10 === 0) { // Retrain every 10 corrections
        await this.trainModel(userId);
      }
      
      console.log('Recorded user correction for user:', userId);
      return true;
      
    } catch (error) {
      console.error('Error recording user correction:', error);
      return false;
    }
  }

  extractPatterns(text) {
    const patterns = [];
    
    // Common patterns
    if (/\d+/.test(text)) patterns.push('contains_numbers');
    if (/[A-Z]{2,}/.test(text)) patterns.push('contains_acronym');
    if (/(inc|corp|llc|ltd)/i.test(text)) patterns.push('company_suffix');
    if (/(store|shop|market)/i.test(text)) patterns.push('retail_pattern');
    if (/(payment|bill|charge)/i.test(text)) patterns.push('payment_pattern');
    
    return patterns;
  }

  detectMerchantType(merchantName) {
    if (!merchantName) return 'unknown';
    
    const merchant = merchantName.toLowerCase();
    
    if (/(amazon|ebay|etsy|shopify)/i.test(merchant)) return 'ecommerce';
    if (/(walmart|target|costco|kroger)/i.test(merchant)) return 'retail';
    if (/(mcdonalds|starbucks|restaurant|cafe)/i.test(merchant)) return 'food';
    if (/(gas|shell|exxon|bp)/i.test(merchant)) return 'gas_station';
    if (/(hotel|airbnb|booking)/i.test(merchant)) return 'travel';
    if (/(uber|lyft|taxi)/i.test(merchant)) return 'transportation';
    
    return 'other';
  }

  categorizeAmount(amount) {
    const absAmount = Math.abs(amount);
    
    if (absAmount < 50) return 'low';
    if (absAmount < 500) return 'medium';
    if (absAmount < 2000) return 'high';
    return 'very_high';
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
