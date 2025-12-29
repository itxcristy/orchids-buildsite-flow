/**
 * Two-Factor Authentication Setup Component
 * Allows users to set up 2FA with QR code scanning
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { setupTwoFactor, verifyAndEnableTwoFactor } from '@/services/api/twoFactor-service';
import { Loader2, CheckCircle2, AlertCircle, Copy, Download } from 'lucide-react';

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps = {}) {
  const [step, setStep] = useState<'init' | 'qr' | 'verify' | 'success'>('init');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationToken, setVerificationToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await setupTwoFactor();
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setRecoveryCodes(response.data.recoveryCodes);
      setStep('qr');
      
      toast({
        title: '2FA Setup Started',
        description: 'Scan the QR code with your authenticator app',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to setup 2FA');
      toast({
        title: 'Setup Failed',
        description: err.message || 'Failed to setup 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyAndEnableTwoFactor(verificationToken);
      setStep('success');
      
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication has been enabled successfully',
      });
      
      // Notify parent component
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 2000); // Wait 2 seconds to show success message
      }
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

  const copyRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: 'Copied',
      description: 'Recovery codes copied to clipboard',
    });
  };

  const downloadRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'buildflow-2fa-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Recovery codes downloaded',
    });
  };

  if (step === 'init') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication (2FA) adds an additional security layer to your account.
              You'll need an authenticator app like Google Authenticator or Authy.
            </p>
          </div>
          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Start Setup'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg border">
              <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
            </div>

            <div className="w-full space-y-2">
              <Label>Or enter this code manually:</Label>
              <div className="flex items-center space-x-2">
                <Input value={secret} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast({
                      title: 'Copied',
                      description: 'Secret code copied to clipboard',
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-full space-y-4 border-t pt-4">
              <div>
                <Label className="text-sm font-semibold">Recovery Codes</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Save these codes in a safe place. You can use them to access your account if you lose your device.
                </p>
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                  {recoveryCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button variant="outline" size="sm" onClick={copyRecoveryCodes}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadRecoveryCodes}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full space-y-2">
              <Label>Enter verification code from your app:</Label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <div className="flex space-x-2 w-full">
              <Button variant="outline" onClick={() => setStep('init')} className="flex-1">
                Back
              </Button>
              <Button onClick={handleVerify} disabled={loading || verificationToken.length !== 6} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'success') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2FA Enabled Successfully</CardTitle>
          <CardDescription>
            Your account is now protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Two-factor authentication has been enabled for your account.
            You'll be asked for a verification code each time you sign in.
          </p>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Make sure you've saved your recovery codes. You'll need them if you lose access to your authenticator app.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return null;
}
