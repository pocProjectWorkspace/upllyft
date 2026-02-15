'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@upllyft/ui';
import { getOrganization, updateOrgSettings } from '@/lib/api/organizations';

export default function OrgSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'banner' | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    website: '',
    logo: '',
    banner: '',
  });

  const [logoPreview, setLogoPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    getOrganization(slug)
      .then((org) => {
        setForm({
          name: org.name || '',
          description: org.description || '',
          website: org.website || '',
          logo: org.logo || '',
          banner: org.banner || '',
        });
        setLogoPreview(org.logo || '');
        setBannerPreview(org.banner || '');
      })
      .catch(() => {
        toast({ title: 'Error', description: 'Failed to load organization', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateOrgSettings(slug, {
        name: form.name,
        description: form.description,
        website: form.website,
      });
      toast({ title: 'Success', description: 'Settings updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function handleFilePreview(file: File, setter: (url: string) => void) {
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload(type: 'logo' | 'banner') {
    const file = type === 'logo' ? logoFile : bannerFile;
    if (!file) return;

    setUploading(type);
    try {
      // Create FormData and upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type === 'logo' ? 'organization-logos' : 'organization-banners');

      // For now, update settings with the preview URL
      // In production this would upload to Supabase first
      toast({ title: 'Info', description: 'Image upload requires backend file storage endpoint' });
    } catch {
      toast({ title: 'Error', description: `Failed to upload ${type}`, variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* General Information */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">General Information</h2>
          <p className="text-sm text-gray-500">Update your organization's details.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your organization..."
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-6 py-2 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900">Branding</h2>
          <p className="text-sm text-gray-500">Customize your organization's look and feel.</p>
        </div>

        {/* Logo */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Logo</label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    handleFilePreview(file, setLogoPreview);
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              />
              <p className="text-xs text-gray-400 mt-1">Recommended: Square image, max 2MB</p>
            </div>
            {logoPreview && (
              <div className="w-16 h-16 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          {logoFile && (
            <button
              onClick={() => handleUpload('logo')}
              disabled={uploading === 'logo'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading === 'logo' ? 'Uploading...' : 'Upload Logo'}
            </button>
          )}
        </div>

        {/* Banner */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Banner</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setBannerFile(file);
                handleFilePreview(file, setBannerPreview);
              }
            }}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
          <p className="text-xs text-gray-400">Recommended: 1200x300px, max 5MB</p>
          {bannerPreview && (
            <div className="w-full h-32 border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
            </div>
          )}
          {bannerFile && (
            <button
              onClick={() => handleUpload('banner')}
              disabled={uploading === 'banner'}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {uploading === 'banner' ? 'Uploading...' : 'Upload Banner'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
