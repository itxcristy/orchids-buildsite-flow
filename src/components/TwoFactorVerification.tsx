/**
 * Two-Factor Authentication Verification Component
 * Used during login when 2FA is enabled
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { verifyTwoFactor } from '@/services/api/twoFactor-service';
import { Loader2, Shield, Key } from 'lucide-react';

interface TwoFactorVerificationProps {
  userId: string;
  agencyDatabase: string;
  onVerified: (token?: string, recoveryCode?: string) => void;
  onCancel?: () => void;
}

export function TwoFactorVerification({
  userId,
  agencyDatabase,
  onVerified,
  onCancel,
}: TwoFactorVerificationProps) {
  const [token, setToken] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVerifyToken = async () => {
    if (!token || token.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Pass token to onVerified callback for login completion
      onVerified(token);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      toast({
        title: 'Verification Failed',
        description: err.message || 'Invalid verification code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode || recoveryCode.length < 8) {
      setError('Please enter a valid recovery code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Pass recovery code to onVerified callback for login completion
      onVerified(undefined, recoveryCode);
    } catch (err: any) {
      setError(err.message || 'Invalid recovery code');
      toast({
        title: 'Verification Failed',
        description: err.message || 'Invalid recovery code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Enter the verification code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="token" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="token">
              <Shield className="mr-2 h-4 w-4" />
              Authenticator Code
            </TabsTrigger>
            <TabsTrigger value="recovery">
              <Key className="mr-2 h-4 w-4" />
              Recovery Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="token" className="space-y-4">
            <div className="space-y-2">
              <Label>Enter 6-digit code</Label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl font-mono tracking-widest"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && token.length === 6) {
                    handleVerifyToken();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleVerifyToken}
              disabled={loading || token.length !== 6}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="recovery" className="space-y-4">
            <div className="space-y-2">
              <Label>Enter recovery code</Label>
              <Input
                type="text"
                placeholder="XXXXXXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && recoveryCode.length >= 8) {
                    handleVerifyRecoveryCode();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Use one of your saved recovery codes if you don't have access to your authenticator app
              </p>
            </div>
            <Button
              onClick={handleVerifyRecoveryCode}
              disabled={loading || recoveryCode.length < 8}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Recovery Code'
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
