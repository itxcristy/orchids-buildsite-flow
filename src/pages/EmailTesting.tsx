import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, Send, CheckCircle, AlertCircle, Loader2, 
  Settings, TestTube, FileText, Bell, Info
} from "lucide-react";
import { 
  getEmailStatus, 
  testEmail, 
  sendEmail, 
  sendNotificationEmail,
  type EmailProviderStatus,
  type TestEmailRequest,
  type SendEmailRequest,
  type NotificationEmailRequest
} from "@/services/api/email-service";

export default function EmailTesting() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [providerStatus, setProviderStatus] = useState<EmailProviderStatus | null>(null);

  // Test Email Form
  const [testEmailData, setTestEmailData] = useState<TestEmailRequest>({
    to: "",
    provider: undefined,
  });

  // Custom Email Form
  const [customEmailData, setCustomEmailData] = useState<SendEmailRequest>({
    to: "",
    subject: "",
    html: "",
    text: "",
    provider: undefined,
  });

  // Notification Email Form
  const [notificationData, setNotificationData] = useState<NotificationEmailRequest>({
    to: "",
    title: "",
    message: "",
    actionUrl: "",
    provider: undefined,
  });

  // Load provider status on mount
  useEffect(() => {
    loadProviderStatus();
  }, []);

  const loadProviderStatus = async () => {
    try {
      setStatusLoading(true);
      const status = await getEmailStatus();
      setProviderStatus(status);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load email provider status",
        variant: "destructive",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailData.to) {
      toast({
        title: "Validation Error",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await testEmail(testEmailData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Test email sent successfully via ${result.provider}`,
        });
        setTestEmailData({ to: "", provider: undefined });
      } else {
        throw new Error(result.error || "Failed to send test email");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustomEmail = async () => {
    if (!customEmailData.to || !customEmailData.subject || (!customEmailData.html && !customEmailData.text)) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await sendEmail(customEmailData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Email sent successfully via ${result.provider}`,
        });
        setCustomEmailData({
          to: "",
          subject: "",
          html: "",
          text: "",
          provider: undefined,
        });
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.to || !notificationData.title || !notificationData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const result = await sendNotificationEmail(notificationData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Notification email sent successfully via ${result.provider}`,
        });
        setNotificationData({
          to: "",
          title: "",
          message: "",
          actionUrl: "",
          provider: undefined,
        });
      } else {
        throw new Error(result.error || "Failed to send notification email");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    if (provider === providerStatus?.active) {
      return "bg-green-100 text-green-800 border-green-300";
    }
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Service Testing</h1>
          <p className="text-muted-foreground mt-2">
            Test and configure your email service with multiple providers
          </p>
        </div>
        <Button onClick={loadProviderStatus} variant="outline" disabled={statusLoading}>
          <Settings className="mr-2 h-4 w-4" />
          {statusLoading ? "Loading..." : "Refresh Status"}
        </Button>
      </div>

      {/* Provider Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Email Provider Status
          </CardTitle>
          <CardDescription>
            Current email provider configuration and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : providerStatus ? (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Active Provider</Label>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getProviderBadgeColor(providerStatus.active)}`}>
                    {providerStatus.providers[providerStatus.active]?.name || providerStatus.active}
                    {providerStatus.providers[providerStatus.active]?.configured && (
                      <CheckCircle className="ml-2 h-4 w-4" />
                    )}
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Available Providers</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(providerStatus.providers).map(([key, provider]) => (
                    <div
                      key={key}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${
                        provider.configured
                          ? "bg-green-100 text-green-800 border-green-300"
                          : provider.available
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : "bg-gray-100 text-gray-800 border-gray-300"
                      }`}
                    >
                      {provider.name}
                      {provider.configured ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : provider.available ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure email providers by setting environment variables. See .env.example for details.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load provider status. Please check your connection.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Email Testing Tabs */}
      <Tabs defaultValue="test" className="space-y-4">
        <TabsList>
          <TabsTrigger value="test">
            <TestTube className="mr-2 h-4 w-4" />
            Test Email
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Mail className="mr-2 h-4 w-4" />
            Custom Email
          </TabsTrigger>
          <TabsTrigger value="notification">
            <Bell className="mr-2 h-4 w-4" />
            Notification
          </TabsTrigger>
        </TabsList>

        {/* Test Email Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your email configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-to">Recipient Email *</Label>
                <Input
                  id="test-to"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmailData.to}
                  onChange={(e) => setTestEmailData({ ...testEmailData, to: e.target.value })}
                />
              </div>

              {providerStatus && (
                <div className="space-y-2">
                  <Label htmlFor="test-provider">Provider (Optional)</Label>
                  <Select
                    value={testEmailData.provider || "default"}
                    onValueChange={(value) => setTestEmailData({ ...testEmailData, provider: value === "default" ? undefined : value })}
                  >
                    <SelectTrigger id="test-provider">
                      <SelectValue placeholder="Use active provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use active provider ({providerStatus.active})</SelectItem>
                      {Object.entries(providerStatus.providers)
                        .filter(([_, provider]) => provider.configured)
                        .map(([key, provider]) => (
                          <SelectItem key={key} value={key}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleTestEmail} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Email Tab */}
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Send Custom Email</CardTitle>
              <CardDescription>
                Send a custom email with HTML or text content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-to">Recipient Email *</Label>
                <Input
                  id="custom-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={customEmailData.to}
                  onChange={(e) => setCustomEmailData({ ...customEmailData, to: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-subject">Subject *</Label>
                <Input
                  id="custom-subject"
                  placeholder="Email subject"
                  value={customEmailData.subject}
                  onChange={(e) => setCustomEmailData({ ...customEmailData, subject: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-html">HTML Content</Label>
                <Textarea
                  id="custom-html"
                  placeholder="<html><body><h1>Hello</h1></body></html>"
                  rows={8}
                  value={customEmailData.html}
                  onChange={(e) => setCustomEmailData({ ...customEmailData, html: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-text">Text Content (Alternative)</Label>
                <Textarea
                  id="custom-text"
                  placeholder="Plain text version"
                  rows={4}
                  value={customEmailData.text}
                  onChange={(e) => setCustomEmailData({ ...customEmailData, text: e.target.value })}
                />
              </div>

              {providerStatus && (
                <div className="space-y-2">
                  <Label htmlFor="custom-provider">Provider (Optional)</Label>
                  <Select
                    value={customEmailData.provider || "default"}
                    onValueChange={(value) => setCustomEmailData({ ...customEmailData, provider: value === "default" ? undefined : value })}
                  >
                    <SelectTrigger id="custom-provider">
                      <SelectValue placeholder="Use active provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use active provider ({providerStatus.active})</SelectItem>
                      {Object.entries(providerStatus.providers)
                        .filter(([_, provider]) => provider.configured)
                        .map(([key, provider]) => (
                          <SelectItem key={key} value={key}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleSendCustomEmail} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Email Tab */}
        <TabsContent value="notification">
          <Card>
            <CardHeader>
              <CardTitle>Send Notification Email</CardTitle>
              <CardDescription>
                Send a formatted notification email with optional action button
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notif-to">Recipient Email *</Label>
                <Input
                  id="notif-to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={notificationData.to}
                  onChange={(e) => setNotificationData({ ...notificationData, to: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notif-title">Title *</Label>
                <Input
                  id="notif-title"
                  placeholder="Notification title"
                  value={notificationData.title}
                  onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notif-message">Message *</Label>
                <Textarea
                  id="notif-message"
                  placeholder="Notification message"
                  rows={4}
                  value={notificationData.message}
                  onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notif-action-url">Action URL (Optional)</Label>
                <Input
                  id="notif-action-url"
                  type="url"
                  placeholder="https://example.com/action"
                  value={notificationData.actionUrl}
                  onChange={(e) => setNotificationData({ ...notificationData, actionUrl: e.target.value })}
                />
              </div>

              {providerStatus && (
                <div className="space-y-2">
                  <Label htmlFor="notif-provider">Provider (Optional)</Label>
                  <Select
                    value={notificationData.provider || "default"}
                    onValueChange={(value) => setNotificationData({ ...notificationData, provider: value === "default" ? undefined : value })}
                  >
                    <SelectTrigger id="notif-provider">
                      <SelectValue placeholder="Use active provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use active provider ({providerStatus.active})</SelectItem>
                      {Object.entries(providerStatus.providers)
                        .filter(([_, provider]) => provider.configured)
                        .map(([key, provider]) => (
                          <SelectItem key={key} value={key}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button onClick={handleSendNotification} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
