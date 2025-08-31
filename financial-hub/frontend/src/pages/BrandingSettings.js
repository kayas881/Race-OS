import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PaintBrushIcon,
  PhotoIcon,
  EnvelopeIcon,
  SwatchIcon,
  BuildingOfficeIcon,
  CameraIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon
} from '@heroicons/react/24/solid';

const BrandingSettings = () => {
  const [branding, setBranding] = useState({
    companyName: '',
    colors: {
      primary: '#3B82F6',
      secondary: '#1F2937',
      accent: '#10B981'
    },
    contact: {
      website: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      }
    },
    invoice: {
      footer: '',
      terms: '',
      notes: '',
      showLogo: true,
      headerText: ''
    },
    email: {
      signature: '',
      fromName: '',
      replyTo: ''
    },
    notifications: {
      emailReminders: {
        enabled: true,
        daysBefore: 3
      },
      overdueNotices: {
        enabled: true,
        daysAfter: [1, 7, 14, 30]
      },
      weeklySummary: {
        enabled: true,
        dayOfWeek: 1,
        includeTransactions: true,
        includeTaxInfo: true
      }
    }
  });

  const [colorPalettes, setColorPalettes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchBranding();
    fetchColorPalettes();
  }, []);

  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/branding', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBranding(data);
        if (data.logo && data.logo.url) {
          setLogoPreview(data.logo.url);
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchColorPalettes = async () => {
    try {
      const response = await fetch('/api/branding/color-palette', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setColorPalettes(data);
      }
    } catch (error) {
      console.error('Error fetching color palettes:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(branding)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Branding settings saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error saving settings' });
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      setMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await fetch('/api/branding/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setLogoPreview(data.logo.url);
        setLogoFile(null);
        setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error uploading logo' });
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setMessage({ type: 'error', text: 'Error uploading logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoRemove = async () => {
    try {
      const response = await fetch('/api/branding/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setLogoPreview(null);
        setMessage({ type: 'success', text: 'Logo removed successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      setMessage({ type: 'error', text: 'Error removing logo' });
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (path, value) => {
    setBranding(prev => {
      const newBranding = { ...prev };
      const keys = path.split('.');
      let current = newBranding;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newBranding;
    });
  };

  const applyColorPalette = (palette) => {
    setBranding(prev => ({
      ...prev,
      colors: {
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent
      }
    }));
  };

  const sendTestEmail = async (type) => {
    try {
      const response = await fetch('/api/branding/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Test email sent! ${data.testUrl ? `Preview: ${data.testUrl}` : ''}` 
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Error sending test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Error sending test email' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PaintBrushIcon className="h-8 w-8 text-blue-600" />
          Branding & Notifications
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Customize your company branding and email preferences
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
            Company Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={branding.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Business Name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={branding.contact.website}
                  onChange={(e) => handleInputChange('contact.website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={branding.contact.email}
                  onChange={(e) => handleInputChange('contact.email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contact@yourcompany.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={branding.contact.phone}
                onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PhotoIcon className="h-6 w-6 text-blue-600" />
            Company Logo
          </h2>

          <div className="space-y-4">
            {logoPreview && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  className="max-h-20 max-w-full object-contain"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <CameraIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Choose Logo</span>
                </div>
              </label>

              {logoFile && (
                <button
                  onClick={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {uploadingLogo ? 'Uploading...' : 'Upload'}
                </button>
              )}

              {logoPreview && (
                <button
                  onClick={handleLogoRemove}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Logo"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Supported formats: PNG, JPG, GIF, SVG. Max size: 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Color Scheme */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <SwatchIcon className="h-6 w-6 text-blue-600" />
          Color Scheme
        </h2>

        {/* Predefined Palettes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Palettes</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {colorPalettes.map((palette, index) => (
              <button
                key={index}
                onClick={() => applyColorPalette(palette)}
                className="group relative p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                title={palette.name}
              >
                <div className="flex gap-1 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: palette.primary }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: palette.secondary }}
                  ></div>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 group-hover:text-gray-900">
                  {palette.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.colors.primary}
                onChange={(e) => handleInputChange('colors.primary', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={branding.colors.primary}
                onChange={(e) => handleInputChange('colors.primary', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.colors.secondary}
                onChange={(e) => handleInputChange('colors.secondary', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={branding.colors.secondary}
                onChange={(e) => handleInputChange('colors.secondary', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#1F2937"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={branding.colors.accent}
                onChange={(e) => handleInputChange('colors.accent', e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={branding.colors.accent}
                onChange={(e) => handleInputChange('colors.accent', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#10B981"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <EnvelopeIcon className="h-6 w-6 text-blue-600" />
          Email Notifications
        </h2>

        <div className="space-y-6">
          {/* Invoice Reminders */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Invoice Reminders</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.notifications.emailReminders.enabled}
                  onChange={(e) => handleInputChange('notifications.emailReminders.enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Send reminder</span>
              <input
                type="number"
                min="1"
                max="30"
                value={branding.notifications.emailReminders.daysBefore}
                onChange={(e) => handleInputChange('notifications.emailReminders.daysBefore', parseInt(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">days before due date</span>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Weekly Summary</h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={branding.notifications.weeklySummary.enabled}
                  onChange={(e) => handleInputChange('notifications.weeklySummary.enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Send on</span>
                <select
                  value={branding.notifications.weeklySummary.dayOfWeek}
                  onChange={(e) => handleInputChange('notifications.weeklySummary.dayOfWeek', parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={branding.notifications.weeklySummary.includeTransactions}
                    onChange={(e) => handleInputChange('notifications.weeklySummary.includeTransactions', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Include transactions</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={branding.notifications.weeklySummary.includeTaxInfo}
                    onChange={(e) => handleInputChange('notifications.weeklySummary.includeTaxInfo', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Include tax info</span>
                </label>
              </div>
            </div>
          </div>

          {/* Test Emails */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Test Emails</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => sendTestEmail('weekly-summary')}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <EyeIcon className="h-4 w-4" />
                Test Weekly Summary
              </button>
              <button
                onClick={() => sendTestEmail('invoice-reminder')}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-2"
              >
                <EyeIcon className="h-4 w-4" />
                Test Invoice Reminder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default BrandingSettings;
