'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Input,
  Label,
  Switch,
  Textarea,
  Separator,
  Skeleton,
  useToast,
} from '@upllyft/ui';
import { useSystemSettings, useUpdateSystemSettings } from '@/hooks/use-admin';
import type { SystemSettings } from '@/lib/api/admin';

const defaultSettings: SystemSettings = {
  siteName: 'Upllyft',
  siteDescription: 'Empowering the neurodivergent community',
  maintenanceMode: false,
  registrationEnabled: true,
  aiEnabled: true,
  aiProvider: 'openai',
  aiModel: 'gpt-5',
  maxTokensPerRequest: 4096,
  enableAutoModeration: true,
  moderationThreshold: 0.7,
  requireEmailVerification: true,
  require2FA: false,
  sessionTimeout: 24,
  maxLoginAttempts: 5,
  maxPostLength: 10000,
  maxCommentLength: 2000,
  allowFileUploads: true,
  maxFileSize: 10,
  allowedFileTypes: ['image/png', 'image/jpeg', 'application/pdf'],
  emailNotifications: true,
  pushNotifications: true,
  digestFrequency: 'weekly',
};

export default function SystemSettingsPage() {
  const { data, isLoading } = useSystemSettings();
  const update = useUpdateSystemSettings();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const handleSave = (section: Partial<SystemSettings>) => {
    update.mutate(section, {
      onSuccess: () => toast({ title: 'Settings saved' }),
      onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure platform-wide settings</p>
      </div>

      {/* Platform Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Site Description</Label>
            <Textarea
              rows={2}
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Take the platform offline for maintenance</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Registration</p>
              <p className="text-xs text-gray-500">Allow new users to create accounts</p>
            </div>
            <Switch
              checked={settings.registrationEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, registrationEnabled: checked })
              }
            />
          </div>
          <Button
            onClick={() =>
              handleSave({
                siteName: settings.siteName,
                siteDescription: settings.siteDescription,
                maintenanceMode: settings.maintenanceMode,
                registrationEnabled: settings.registrationEnabled,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving...' : 'Save Platform Settings'}
          </Button>
        </div>
      </Card>

      {/* AI Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable AI Features</p>
              <p className="text-xs text-gray-500">AI-powered insights, worksheets, and moderation</p>
            </div>
            <Switch
              checked={settings.aiEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, aiEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Auto-Moderation</p>
              <p className="text-xs text-gray-500">Automatically flag potentially harmful content</p>
            </div>
            <Switch
              checked={settings.enableAutoModeration}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableAutoModeration: checked })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Moderation Sensitivity (0-1)</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={settings.moderationThreshold}
              onChange={(e) =>
                setSettings({ ...settings, moderationThreshold: Number(e.target.value) })
              }
            />
          </div>
          <Button
            onClick={() =>
              handleSave({
                aiEnabled: settings.aiEnabled,
                enableAutoModeration: settings.enableAutoModeration,
                moderationThreshold: settings.moderationThreshold,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving...' : 'Save AI Settings'}
          </Button>
        </div>
      </Card>

      {/* Security Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Require Email Verification</p>
              <p className="text-xs text-gray-500">Users must verify email before accessing the platform</p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, requireEmailVerification: checked })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Session Timeout (hours)</Label>
            <Input
              type="number"
              min={1}
              value={settings.sessionTimeout}
              onChange={(e) =>
                setSettings({ ...settings, sessionTimeout: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Login Attempts</Label>
            <Input
              type="number"
              min={1}
              value={settings.maxLoginAttempts}
              onChange={(e) =>
                setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })
              }
            />
          </div>
          <Button
            onClick={() =>
              handleSave({
                requireEmailVerification: settings.requireEmailVerification,
                sessionTimeout: settings.sessionTimeout,
                maxLoginAttempts: settings.maxLoginAttempts,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </div>
      </Card>

      {/* Content Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Max Post Length</Label>
            <Input
              type="number"
              min={100}
              value={settings.maxPostLength}
              onChange={(e) =>
                setSettings({ ...settings, maxPostLength: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Comment Length</Label>
            <Input
              type="number"
              min={100}
              value={settings.maxCommentLength}
              onChange={(e) =>
                setSettings({ ...settings, maxCommentLength: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Allow File Uploads</p>
              <p className="text-xs text-gray-500">Allow users to upload files in posts</p>
            </div>
            <Switch
              checked={settings.allowFileUploads}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowFileUploads: checked })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              min={1}
              value={settings.maxFileSize}
              onChange={(e) =>
                setSettings({ ...settings, maxFileSize: Number(e.target.value) })
              }
            />
          </div>
          <Button
            onClick={() =>
              handleSave({
                maxPostLength: settings.maxPostLength,
                maxCommentLength: settings.maxCommentLength,
                allowFileUploads: settings.allowFileUploads,
                maxFileSize: settings.maxFileSize,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving...' : 'Save Content Settings'}
          </Button>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Email Notifications</p>
              <p className="text-xs text-gray-500">Send email notifications to users</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Push Notifications</p>
              <p className="text-xs text-gray-500">Send push notifications via Firebase</p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, pushNotifications: checked })
              }
            />
          </div>
          <Button
            onClick={() =>
              handleSave({
                emailNotifications: settings.emailNotifications,
                pushNotifications: settings.pushNotifications,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? 'Saving...' : 'Save Notification Settings'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
