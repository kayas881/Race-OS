const Category = require('../models/Category');
const database = require('../config/database');
require('dotenv').config();

const categories = [
  // Income Categories
  {
    name: 'Ad Revenue',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['youtube', 'adsense', 'ad revenue', 'monetization', 'cpm', 'rpm'],
    description: 'Revenue from platform advertisements',
    icon: '📺',
    color: '#ef4444',
    creatorSpecific: true,
    platforms: ['youtube', 'twitch'],
    isDefault: true
  },
  {
    name: 'Sponsorship',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['sponsor', 'brand deal', 'partnership', 'collaboration', 'promotional'],
    description: 'Sponsored content and brand partnerships',
    icon: '🤝',
    color: '#8b5cf6',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Subscription Revenue',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['patreon', 'substack', 'twitch prime', 'membership', 'subscriber'],
    description: 'Monthly subscription income',
    icon: '💳',
    color: '#10b981',
    creatorSpecific: true,
    platforms: ['patreon', 'substack', 'twitch'],
    isDefault: true
  },
  {
    name: 'Donations & Tips',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['donation', 'tip', 'super chat', 'bits', 'cheer', 'streamlabs'],
    description: 'Viewer donations and tips',
    icon: '💝',
    color: '#f59e0b',
    creatorSpecific: true,
    platforms: ['twitch', 'youtube'],
    isDefault: true
  },
  {
    name: 'Merchandise Sales',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['merch', 'teespring', 'printful', 'shopify', 'store sales'],
    description: 'Revenue from merchandise sales',
    icon: '👕',
    color: '#06b6d4',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Affiliate Income',
    type: 'income',
    isBusinessRelated: true,
    isTaxDeductible: false,
    keywords: ['affiliate', 'commission', 'amazon associates', 'referral'],
    description: 'Affiliate marketing commissions',
    icon: '🔗',
    color: '#84cc16',
    creatorSpecific: true,
    isDefault: true
  },

  // Business Expense Categories
  {
    name: 'Equipment',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'equipment',
    keywords: ['camera', 'microphone', 'lighting', 'computer', 'laptop', 'monitor', 'audio', 'video', 'gaming', 'console', 'capture card'],
    description: 'Business equipment purchases',
    icon: '📷',
    color: '#6b7280',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Software & Subscriptions',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'software',
    keywords: ['adobe', 'photoshop', 'premiere', 'after effects', 'obs', 'streamlabs', 'canva', 'figma', 'software', 'subscription', 'saas'],
    description: 'Software and online service subscriptions',
    icon: '💻',
    color: '#3b82f6',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Internet & Phone',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'business_expense',
    keywords: ['internet', 'wifi', 'broadband', 'phone', 'mobile', 'cellular', 'data plan'],
    description: 'Internet and phone services',
    icon: '📡',
    color: '#059669',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Office Supplies',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'office_supplies',
    keywords: ['office', 'desk', 'chair', 'supplies', 'stationary', 'notebook', 'pen'],
    description: 'Office supplies and furniture',
    icon: '🗂️',
    color: '#7c3aed',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Marketing & Advertising',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'marketing',
    keywords: ['advertising', 'facebook ads', 'google ads', 'promotion', 'marketing', 'social media'],
    description: 'Marketing and advertising expenses',
    icon: '📢',
    color: '#dc2626',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Education & Training',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'business_expense',
    keywords: ['course', 'tutorial', 'training', 'conference', 'workshop', 'udemy', 'skillshare'],
    description: 'Professional development and education',
    icon: '📚',
    color: '#0891b2',
    creatorSpecific: true,
    isDefault: true
  },
  {
    name: 'Travel & Transportation',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'travel',
    keywords: ['travel', 'flight', 'hotel', 'uber', 'lyft', 'taxi', 'conference', 'event'],
    description: 'Business travel and transportation',
    icon: '✈️',
    color: '#7c2d12',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Business Meals',
    type: 'expense',
    isBusinessRelated: true,
    isTaxDeductible: true,
    taxDeductionType: 'meals',
    keywords: ['restaurant', 'food', 'coffee', 'lunch', 'dinner', 'business meal'],
    description: 'Business meals and entertainment',
    icon: '🍽️',
    color: '#be123c',
    creatorSpecific: false,
    isDefault: true
  },

  // Personal Categories
  {
    name: 'Groceries',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['grocery', 'supermarket', 'walmart', 'target', 'costco', 'food'],
    description: 'Personal grocery shopping',
    icon: '🛒',
    color: '#65a30d',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Utilities',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['electric', 'gas', 'water', 'utility', 'energy'],
    description: 'Home utilities',
    icon: '⚡',
    color: '#ca8a04',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Rent & Mortgage',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['rent', 'mortgage', 'housing', 'apartment'],
    description: 'Housing costs',
    icon: '🏠',
    color: '#9333ea',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Personal Care',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['haircut', 'salon', 'spa', 'personal care', 'beauty'],
    description: 'Personal care and beauty',
    icon: '💄',
    color: '#ec4899',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Entertainment',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['movie', 'entertainment', 'streaming', 'netflix', 'spotify', 'games'],
    description: 'Personal entertainment',
    icon: '🎬',
    color: '#f97316',
    creatorSpecific: false,
    isDefault: true
  },
  {
    name: 'Other',
    type: 'expense',
    isBusinessRelated: false,
    isTaxDeductible: false,
    keywords: ['miscellaneous', 'other'],
    description: 'Miscellaneous expenses',
    icon: '📦',
    color: '#64748b',
    creatorSpecific: false,
    isDefault: true
  }
];

async function seedCategories() {
  try {
    // Connect to MongoDB using our database config
    await database.connect();
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert new categories
    await Category.insertMany(categories);
    console.log(`Inserted ${categories.length} categories`);

    console.log('Categories seeded successfully!');
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    await database.disconnect();
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  seedCategories();
}

module.exports = { categories, seedCategories };
