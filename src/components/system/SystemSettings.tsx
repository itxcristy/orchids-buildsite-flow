import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RefreshCw, Settings, Image, Search, Tag, Megaphone, Mail, Globe, Shield } from 'lucide-react';
import { fetchSystemSettings, updateSystemSettings, type SystemSettings } from '@/services/system-settings';

export function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSystemSettings();
      setSettings(data);
      setFormData(data);
    } catch (error: any) {
      toast({
        title: 'Error Loading Settings',
        description: error.message || 'Failed to load system settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateSystemSettings(formData);
      setSettings(updated);
      setFormData(updated);
      toast({
        title: 'Settings Saved',
        description: 'System settings have been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error Saving Settings',
        description: error.message || 'Failed to save system settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure system-wide settings for branding, SEO, analytics, and more
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadSettings} disabled={loading || saving}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="identity" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="advertising">Ads</TabsTrigger>
              <TabsTrigger value="other">Other</TabsTrigger>
            </TabsList>

            {/* Identity Tab */}
            <TabsContent value="identity" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="system_name">System Name *</Label>
                  <Input
                    id="system_name"
                    value={formData.system_name || ''}
                    onChange={(e) => handleChange('system_name', e.target.value)}
                    placeholder="BuildFlow ERP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system_tagline">System Tagline</Label>
                  <Input
                    id="system_tagline"
                    value={formData.system_tagline || ''}
                    onChange={(e) => handleChange('system_tagline', e.target.value)}
                    placeholder="Complete Business Management Solution"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="system_description">System Description</Label>
                <Textarea
                  id="system_description"
                  value={formData.system_description || ''}
                  onChange={(e) => handleChange('system_description', e.target.value)}
                  placeholder="A comprehensive ERP system for managing your business operations"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_language">Default Language</Label>
                  <Input
                    id="default_language"
                    value={formData.default_language || 'en'}
                    onChange={(e) => handleChange('default_language', e.target.value)}
                    placeholder="en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_timezone">Default Timezone</Label>
                  <Input
                    id="default_timezone"
                    value={formData.default_timezone || 'UTC'}
                    onChange={(e) => handleChange('default_timezone', e.target.value)}
                    placeholder="UTC"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Main Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url || ''}
                    onChange={(e) => handleChange('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="favicon_url">Favicon URL</Label>
                  <Input
                    id="favicon_url"
                    value={formData.favicon_url || ''}
                    onChange={(e) => handleChange('favicon_url', e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="login_logo_url">Login Logo URL</Label>
                  <Input
                    id="login_logo_url"
                    value={formData.login_logo_url || ''}
                    onChange={(e) => handleChange('login_logo_url', e.target.value)}
                    placeholder="https://example.com/login-logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_logo_url">Email Logo URL</Label>
                  <Input
                    id="email_logo_url"
                    value={formData.email_logo_url || ''}
                    onChange={(e) => handleChange('email_logo_url', e.target.value)}
                    placeholder="https://example.com/email-logo.png"
                  />
                </div>
              </div>
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title || ''}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  placeholder="BuildFlow ERP - Complete Business Management"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description || ''}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  placeholder="A comprehensive ERP system for managing your business operations"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_keywords">Meta Keywords (comma-separated)</Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords || ''}
                  onChange={(e) => handleChange('meta_keywords', e.target.value)}
                  placeholder="ERP, business management, CRM, accounting"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og_image_url">Open Graph Image URL</Label>
                <Input
                  id="og_image_url"
                  value={formData.og_image_url || ''}
                  onChange={(e) => handleChange('og_image_url', e.target.value)}
                  placeholder="https://example.com/og-image.png"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="og_title">Open Graph Title</Label>
                  <Input
                    id="og_title"
                    value={formData.og_title || ''}
                    onChange={(e) => handleChange('og_title', e.target.value)}
                    placeholder="BuildFlow ERP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="og_description">Open Graph Description</Label>
                  <Input
                    id="og_description"
                    value={formData.og_description || ''}
                    onChange={(e) => handleChange('og_description', e.target.value)}
                    placeholder="Complete Business Management Solution"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter_card_type">Twitter Card Type</Label>
                  <Input
                    id="twitter_card_type"
                    value={formData.twitter_card_type || 'summary_large_image'}
                    onChange={(e) => handleChange('twitter_card_type', e.target.value)}
                    placeholder="summary_large_image"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter_site">Twitter Site</Label>
                  <Input
                    id="twitter_site"
                    value={formData.twitter_site || ''}
                    onChange={(e) => handleChange('twitter_site', e.target.value)}
                    placeholder="@buildflow"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter_creator">Twitter Creator</Label>
                  <Input
                    id="twitter_creator"
                    value={formData.twitter_creator || ''}
                    onChange={(e) => handleChange('twitter_creator', e.target.value)}
                    placeholder="@buildflow"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    value={formData.google_analytics_id || ''}
                    onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_tag_manager_id">Google Tag Manager ID</Label>
                  <Input
                    id="google_tag_manager_id"
                    value={formData.google_tag_manager_id || ''}
                    onChange={(e) => handleChange('google_tag_manager_id', e.target.value)}
                    placeholder="GTM-XXXXXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook_pixel_id">Facebook Pixel ID</Label>
                <Input
                  id="facebook_pixel_id"
                  value={formData.facebook_pixel_id || ''}
                  onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_tracking_code">Custom Tracking Code</Label>
                <Textarea
                  id="custom_tracking_code"
                  value={formData.custom_tracking_code || ''}
                  onChange={(e) => handleChange('custom_tracking_code', e.target.value)}
                  placeholder="Paste your custom tracking code here (HTML/JavaScript)"
                  rows={5}
                />
              </div>
            </TabsContent>

            {/* Advertising Tab */}
            <TabsContent value="advertising" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ad_network_enabled">Enable Advertisement Network</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable third-party advertisement network integration
                  </p>
                </div>
                <Switch
                  id="ad_network_enabled"
                  checked={formData.ad_network_enabled || false}
                  onCheckedChange={(checked) => handleChange('ad_network_enabled', checked)}
                />
              </div>
              {formData.ad_network_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ad_network_code">Advertisement Network Code</Label>
                    <Textarea
                      id="ad_network_code"
                      value={formData.ad_network_code || ''}
                      onChange={(e) => handleChange('ad_network_code', e.target.value)}
                      placeholder="Paste your advertisement network code here"
                      rows={5}
                    />
                  </div>
                  <div className="space-y-4">
                    <Label>Advertisement Placement</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ad_placement_header" className="cursor-pointer">
                          Header Placement
                        </Label>
                        <Switch
                          id="ad_placement_header"
                          checked={formData.ad_placement_header || false}
                          onCheckedChange={(checked) => handleChange('ad_placement_header', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ad_placement_sidebar" className="cursor-pointer">
                          Sidebar Placement
                        </Label>
                        <Switch
                          id="ad_placement_sidebar"
                          checked={formData.ad_placement_sidebar || false}
                          onCheckedChange={(checked) => handleChange('ad_placement_sidebar', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ad_placement_footer" className="cursor-pointer">
                          Footer Placement
                        </Label>
                        <Switch
                          id="ad_placement_footer"
                          checked={formData.ad_placement_footer || false}
                          onCheckedChange={(checked) => handleChange('ad_placement_footer', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Other Settings Tab */}
            <TabsContent value="other" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={formData.support_email || ''}
                      onChange={(e) => handleChange('support_email', e.target.value)}
                      placeholder="support@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support_phone">Support Phone</Label>
                    <Input
                      id="support_phone"
                      value={formData.support_phone || ''}
                      onChange={(e) => handleChange('support_phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_address">Support Address</Label>
                  <Textarea
                    id="support_address"
                    value={formData.support_address || ''}
                    onChange={(e) => handleChange('support_address', e.target.value)}
                    placeholder="123 Main St, City, State, ZIP"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Media Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="facebook_url">Facebook URL</Label>
                    <Input
                      id="facebook_url"
                      value={formData.facebook_url || ''}
                      onChange={(e) => handleChange('facebook_url', e.target.value)}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter_url">Twitter URL</Label>
                    <Input
                      id="twitter_url"
                      value={formData.twitter_url || ''}
                      onChange={(e) => handleChange('twitter_url', e.target.value)}
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url || ''}
                      onChange={(e) => handleChange('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram_url">Instagram URL</Label>
                    <Input
                      id="instagram_url"
                      value={formData.instagram_url || ''}
                      onChange={(e) => handleChange('instagram_url', e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">YouTube URL</Label>
                    <Input
                      id="youtube_url"
                      value={formData.youtube_url || ''}
                      onChange={(e) => handleChange('youtube_url', e.target.value)}
                      placeholder="https://youtube.com/@yourchannel"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Legal & Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="terms_of_service_url">Terms of Service URL</Label>
                    <Input
                      id="terms_of_service_url"
                      value={formData.terms_of_service_url || ''}
                      onChange={(e) => handleChange('terms_of_service_url', e.target.value)}
                      placeholder="https://example.com/terms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privacy_policy_url">Privacy Policy URL</Label>
                    <Input
                      id="privacy_policy_url"
                      value={formData.privacy_policy_url || ''}
                      onChange={(e) => handleChange('privacy_policy_url', e.target.value)}
                      placeholder="https://example.com/privacy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cookie_policy_url">Cookie Policy URL</Label>
                    <Input
                      id="cookie_policy_url"
                      value={formData.cookie_policy_url || ''}
                      onChange={(e) => handleChange('cookie_policy_url', e.target.value)}
                      placeholder="https://example.com/cookies"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Maintenance Mode</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="maintenance_mode">Enable Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Show maintenance message to all users
                    </p>
                  </div>
                  <Switch
                    id="maintenance_mode"
                    checked={formData.maintenance_mode || false}
                    onCheckedChange={(checked) => handleChange('maintenance_mode', checked)}
                  />
                </div>
                {formData.maintenance_mode && (
                  <div className="space-y-2">
                    <Label htmlFor="maintenance_message">Maintenance Message</Label>
                    <Textarea
                      id="maintenance_message"
                      value={formData.maintenance_message || ''}
                      onChange={(e) => handleChange('maintenance_message', e.target.value)}
                      placeholder="We're currently performing scheduled maintenance. Please check back soon."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

