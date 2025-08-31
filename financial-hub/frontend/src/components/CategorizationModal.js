import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CategorizationModal = ({ isOpen, onClose, transaction, onUpdate }) => {
  const [formData, setFormData] = useState({
    category: {
      primary: '',
      detailed: ''
    },
    businessClassification: 'personal',
    taxDeductible: {
      isDeductible: false,
      deductionType: '',
      notes: ''
    },
    notes: ''
  });
  
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category options
  const categoryOptions = {
    income: [
      'ad_revenue', 'sponsorship', 'subscription', 'donation', 
      'merchandise', 'affiliate', 'salary', 'freelance'
    ],
    business_expenses: [
      'equipment', 'software', 'internet_phone', 'office_supplies',
      'marketing', 'education', 'travel', 'meals'
    ],
    personal: [
      'groceries', 'utilities', 'rent_mortgage', 'personal_care',
      'entertainment', 'transportation', 'healthcare'
    ]
  };

  const deductionTypes = [
    'business_expense', 'office_supplies', 'equipment', 'software',
    'marketing', 'travel', 'meals', 'other'
  ];

  useEffect(() => {
    if (isOpen && transaction) {
      // Initialize form with current transaction data
      setFormData({
        category: {
          primary: transaction.category?.primary || '',
          detailed: transaction.category?.detailed || ''
        },
        businessClassification: transaction.businessClassification || 'personal',
        taxDeductible: {
          isDeductible: transaction.taxDeductible?.isDeductible || false,
          deductionType: transaction.taxDeductible?.deductionType || '',
          notes: transaction.taxDeductible?.notes || ''
        },
        notes: transaction.notes || ''
      });

      // Fetch categorization suggestions
      fetchSuggestions();
    }
  }, [isOpen, transaction]);

  const fetchSuggestions = async () => {
    if (!transaction) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions/${transaction._id}/categorization-suggestions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      category: {
        primary: suggestion.category,
        detailed: suggestion.category
      },
      taxDeductible: {
        ...prev.taxDeductible,
        isDeductible: suggestion.taxDeductible
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/transactions/${transaction._id}/categorize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.transaction);
        onClose();
      } else {
        throw new Error('Failed to update categorization');
      }
    } catch (error) {
      console.error('Error updating categorization:', error);
      alert('Failed to update categorization. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const retrainModel = async () => {
    try {
      const response = await fetch('/api/transactions/retrain-model', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.trained) {
        alert('Smart categorization model updated successfully!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error retraining model:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Categorize Transaction
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {transaction?.description} • ${Math.abs(transaction?.amount || 0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="text-sm font-medium text-blue-900">
                      Smart Suggestions
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                      >
                        {suggestion.category} ({Math.round(suggestion.confidence * 100)}%)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Category
                </label>
                <select
                  value={formData.category.primary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    category: { ...prev.category, primary: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category</option>
                  <optgroup label="Income">
                    {categoryOptions.income.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Business Expenses">
                    {categoryOptions.business_expenses.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Personal">
                    {categoryOptions.personal.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Business Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Classification
                </label>
                <div className="flex space-x-4">
                  {['business', 'personal', 'mixed'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="radio"
                        value={type}
                        checked={formData.businessClassification === type}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          businessClassification: e.target.value
                        }))}
                        className="mr-2"
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tax Deductible */}
              <div>
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={formData.taxDeductible.isDeductible}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      taxDeductible: {
                        ...prev.taxDeductible,
                        isDeductible: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Tax Deductible
                  </label>
                </div>

                {formData.taxDeductible.isDeductible && (
                  <div className="ml-6 space-y-3">
                    <select
                      value={formData.taxDeductible.deductionType}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        taxDeductible: {
                          ...prev.taxDeductible,
                          deductionType: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select deduction type</option>
                      {deductionTypes.map(type => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    
                    <textarea
                      placeholder="Tax deduction notes (optional)"
                      value={formData.taxDeductible.notes}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        taxDeductible: {
                          ...prev.taxDeductible,
                          notes: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this transaction..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={retrainModel}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Update Smart Categorization
                </button>
                
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !formData.category.primary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CategorizationModal;
