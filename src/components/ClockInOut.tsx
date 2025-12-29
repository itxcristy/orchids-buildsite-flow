import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, MapPin, Loader2, CheckCircle, XCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/database';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { generateUUID } from '@/lib/uuid';
import { getAgencyId } from '@/utils/agencyUtils';
import { useAgencySettings } from '@/hooks/useAgencySettings';

interface AttendanceRecord {
  id: string;
  user_id?: string;
  employee_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_worked?: number | null;
  total_hours: number | null;
  location: string | null;
  status: string;
  overtime_hours?: number | null;
  agency_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  accuracy?: number;
}

interface ClockInOutProps {
  compact?: boolean;
}

// Cross-browser geolocation with fallbacks
const getLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      // Fallback for browsers without geolocation
      console.warn('Geolocation not supported, using fallback');
      resolve({
        lat: 0,
        lng: 0,
        address: 'Location unavailable (browser not supported)',
        accuracy: 0
      });
      return;
    }

    // Options for better cross-browser compatibility
    const options: PositionOptions = {
      enableHighAccuracy: false, // Start with low accuracy for faster response
      timeout: 15000, // 15 second timeout
      maximumAge: 300000 // Accept cached position up to 5 minutes old
    };

    const successCallback = async (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      // Try to get address using reverse geocoding (free service)
      let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      try {
        // Use free OpenStreetMap Nominatim for reverse geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'BuildFlow/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            // Shorten the address
            const parts = data.display_name.split(',');
            address = parts.slice(0, 3).join(',').trim();
          }
        }
      } catch (error) {
        // Reverse geocoding failed, using coordinates
      }
      
      resolve({
        lat: latitude,
        lng: longitude,
        address,
        accuracy
      });
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.warn('Geolocation error:', error.message);
      
      // Provide meaningful fallback based on error type
      let fallbackAddress = 'Location unavailable';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          fallbackAddress = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          fallbackAddress = 'Location unavailable';
          break;
        case error.TIMEOUT:
          fallbackAddress = 'Location timeout';
          break;
      }
      
      // Resolve with fallback instead of rejecting to allow clock in/out without location
      resolve({
        lat: 0,
        lng: 0,
        address: fallbackAddress,
        accuracy: 0
      });
    };

    // Check for permissions API (modern browsers)
    if (navigator.permissions && navigator.permissions.query) {
      let geolocationRequested = false;
      let resolved = false;
      
      const resolveOnce = (value: LocationData) => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };
      
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            // Permission already denied, resolve immediately with fallback
            resolveOnce({
              lat: 0,
              lng: 0,
              address: 'Location permission denied',
              accuracy: 0
            });
            return;
          }
          
          // Permission is granted or prompt - proceed with geolocation
          geolocationRequested = true;
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!resolved && successCallback) {
                // Handle async callback properly
                successCallback(position).catch(() => {
                  // If callback fails, resolve with fallback
                  if (!resolved) {
                    resolveOnce({
                      lat: 0,
                      lng: 0,
                      address: 'Location unavailable',
                      accuracy: 0
                    });
                  }
                });
              }
            },
            (error) => {
              if (!resolved && errorCallback) {
                errorCallback(error);
              }
            },
            options
          );
          
          // Listen for permission changes
          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'denied' && !geolocationRequested) {
              // Permission was denied before we could request, resolve with fallback
              resolveOnce({
                lat: 0,
                lng: 0,
                address: 'Location permission denied',
                accuracy: 0
              });
            }
          };
        })
        .catch(() => {
          // Permissions API not fully supported or failed, try direct geolocation
          if (!resolved && successCallback && errorCallback) {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
          } else if (!resolved) {
            // If callbacks are not available, resolve with fallback
            resolve({
              lat: 0,
              lng: 0,
              address: 'Location unavailable',
              accuracy: 0
            });
          }
        });
    } else {
      // Fallback for browsers without Permissions API
      if (successCallback && errorCallback) {
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
      } else {
        // If callbacks are not available, resolve with fallback
        resolve({
          lat: 0,
          lng: 0,
          address: 'Location unavailable',
          accuracy: 0
        });
      }
    }
  });
};

const ClockInOut = ({ compact = false }: ClockInOutProps) => {
  const { user, profile } = useAuth();
  const { settings: agencySettings } = useAgencySettings();
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'available' | 'unavailable' | 'denied'>('checking');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check location availability on mount
  useEffect(() => {
    const checkLocationAvailability = async () => {
      if (!navigator.geolocation) {
        setLocationStatus('unavailable');
        return;
      }

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          if (result.state === 'denied') {
            setLocationStatus('denied');
          } else if (result.state === 'granted') {
            setLocationStatus('available');
          } else {
            setLocationStatus('available'); // prompt state
          }

          result.onchange = () => {
            if (result.state === 'denied') {
              setLocationStatus('denied');
            } else {
              setLocationStatus('available');
            }
          };
        } catch {
          setLocationStatus('available');
        }
      } else {
        setLocationStatus('available');
      }
    };

    checkLocationAvailability();
  }, []);

  // Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      const { data, error } = await db
        .from('attendance')
        .select('*')
        .eq('user_id', user.id) // Use user_id as primary lookup
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching attendance:', error);
        return;
      }

      setTodayAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchTodayAttendance();
    }
  }, [user?.id, fetchTodayAttendance]);

  const calculateHours = (checkInTime: string, checkOutTime: string): number => {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diffInMs = checkOut.getTime() - checkIn.getTime();
    return Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100;
  };

  // Check if clock-in is late based on agency working hours
  const isLateClockIn = (checkInTime: string): boolean => {
    if (!agencySettings?.working_hours_start) return false;
    
    const [hours, minutes] = agencySettings.working_hours_start.split(':').map(Number);
    const workingStart = new Date();
    workingStart.setHours(hours, minutes, 0, 0);
    
    const checkIn = new Date(checkInTime);
    checkIn.setSeconds(0, 0);
    
    return checkIn > workingStart;
  };

  // Calculate overtime based on agency working hours
  const calculateOvertime = (totalHours: number): number => {
    if (!agencySettings?.working_hours_start || !agencySettings?.working_hours_end) {
      // Default: 9 hours standard work day
      return totalHours > 9 ? Math.round((totalHours - 9) * 100) / 100 : 0;
    }
    
    const [startHours, startMinutes] = agencySettings.working_hours_start.split(':').map(Number);
    const [endHours, endMinutes] = agencySettings.working_hours_end.split(':').map(Number);
    
    const startTime = startHours + startMinutes / 60;
    const endTime = endHours + endMinutes / 60;
    const standardHours = endTime - startTime;
    
    return totalHours > standardHours ? Math.round((totalHours - standardHours) * 100) / 100 : 0;
  };

  const handleClockIn = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to clock in",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setFetchingLocation(true);
    
    try {
      // Get location (will not fail, returns fallback if unavailable)
      const locationData = await getLocation();
      setFetchingLocation(false);
      
      const now = new Date().toISOString();
      const today = format(new Date(), 'yyyy-MM-dd');
      const agencyId = await getAgencyId(profile, user?.id);
      
      // Determine status based on clock-in time and agency working hours
      let status = 'present';
      if (isLateClockIn(now)) {
        status = 'late';
      }

      const attendanceData = {
        id: generateUUID(),
        user_id: user.id, // Required field
        employee_id: user.id, // Will be synced by trigger if null
        date: today,
        check_in_time: now,
        location: locationData.address || null,
        status: status,
        agency_id: agencyId || null,
        created_at: now
      };

      const { data, error } = await db
        .from('attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data);
      
      const statusMessage = status === 'late' 
        ? ' (Late arrival)' 
        : '';
      
      toast({
        title: "✅ Clocked In Successfully",
        description: `Checked in at ${format(new Date(), 'HH:mm:ss')}${statusMessage}${locationData.address && locationData.address !== 'Location unavailable' ? ` • ${locationData.address}` : ''}`
      });
    } catch (error: any) {
      console.error('Clock in error:', error);
      toast({
        title: "Clock In Failed",
        description: error.message || 'An error occurred while clocking in',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setFetchingLocation(false);
    }
  };

  const handleClockOut = async () => {
    if (!user?.id || !todayAttendance) {
      toast({
        title: "Error",
        description: "No active session to clock out from",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setFetchingLocation(true);
    
    try {
      const locationData = await getLocation();
      setFetchingLocation(false);
      
      const now = new Date().toISOString();
      
      const totalHours = todayAttendance.check_in_time 
        ? calculateHours(todayAttendance.check_in_time, now)
        : 0;

      const overtimeHours = calculateOvertime(totalHours);

      // Create location string with both check-in and check-out locations
      const locationString = todayAttendance.location 
        ? `In: ${todayAttendance.location} | Out: ${locationData.address || 'Location unavailable'}`
        : (locationData.address || null);

      const { data, error } = await db
        .from('attendance')
        .update({
          check_out_time: now,
          hours_worked: totalHours, // Primary field
          total_hours: totalHours, // For compatibility
          overtime_hours: overtimeHours,
          location: locationString
          // updated_at is automatically set by the database service
        })
        .eq('id', todayAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodayAttendance(data);
      toast({
        title: "✅ Clocked Out Successfully",
        description: `Total hours worked: ${totalHours.toFixed(2)} hours${overtimeHours > 0 ? ` (${overtimeHours.toFixed(2)} overtime)` : ''}`
      });
    } catch (error: any) {
      console.error('Clock out error:', error);
      toast({
        title: "Clock Out Failed",
        description: error.message || 'An error occurred while clocking out',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setFetchingLocation(false);
    }
  };

  const canClockIn = !todayAttendance || !todayAttendance.check_in_time;
  const canClockOut = todayAttendance && todayAttendance.check_in_time && !todayAttendance.check_out_time;
  const isCompleted = todayAttendance && todayAttendance.check_out_time;

  // Calculate elapsed time if currently clocked in
  const getElapsedTime = () => {
    if (!todayAttendance?.check_in_time || todayAttendance?.check_out_time) return null;
    
    const checkIn = new Date(todayAttendance.check_in_time);
    const now = new Date();
    const diffMs = now.getTime() - checkIn.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getLocationStatusBadge = () => {
    switch (locationStatus) {
      case 'available':
        return <Badge variant="outline" className="text-green-600 border-green-200"><MapPin className="h-3 w-3 mr-1" />Location Ready</Badge>;
      case 'denied':
        return <Badge variant="outline" className="text-red-600 border-red-200"><XCircle className="h-3 w-3 mr-1" />Location Denied</Badge>;
      case 'unavailable':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />No Location</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Checking...</Badge>;
    }
  };

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Current Time */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-mono font-bold text-xl">
                  {format(currentTime, 'HH:mm:ss')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(currentTime, 'EEEE, MMM dd, yyyy')}
                </div>
              </div>
            </div>

            {/* Status & Elapsed Time */}
            <div className="flex flex-col items-center gap-1">
              {canClockOut && (
                <>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Working
                  </Badge>
                  <div className="text-sm font-mono text-green-600 font-medium">
                    {getElapsedTime()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Since {format(new Date(todayAttendance!.check_in_time!), 'HH:mm')}
                  </div>
                </>
              )}
              {isCompleted && (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed ({Number(todayAttendance?.hours_worked || todayAttendance?.total_hours || 0).toFixed(1)}h)
                </Badge>
              )}
              {canClockIn && (
                <Badge variant="outline" className="text-muted-foreground">
                  Not clocked in
                </Badge>
              )}
            </div>

            {/* Online Status */}
            <div className="hidden sm:flex items-center gap-2">
              {isOnline ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>

            {/* Action Button */}
            <div className="w-full sm:w-auto">
              {canClockIn && (
                <Button 
                  onClick={handleClockIn} 
                  disabled={loading || !isOnline}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {fetchingLocation ? 'Getting Location...' : 'Clocking In...'}
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              )}

              {canClockOut && (
                <Button 
                  onClick={handleClockOut} 
                  disabled={loading || !isOnline}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {fetchingLocation ? 'Getting Location...' : 'Clocking Out...'}
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Clock Out
                    </>
                  )}
                </Button>
              )}

              {isCompleted && (
                <Badge variant="outline" className="text-muted-foreground px-4 py-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Day Complete
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full component for dedicated attendance page
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Clock className="h-6 w-6" />
          Time Clock
        </CardTitle>
        <CardDescription>
          Track your work hours with location
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Time Display */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-4xl font-mono font-bold text-primary">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {format(currentTime, 'EEEE, MMMM do, yyyy')}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex justify-center gap-2 flex-wrap">
          {getLocationStatusBadge()}
          {isOnline ? (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-200">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>

        {/* Location Permission Warning */}
        {locationStatus === 'denied' && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              Location is disabled. You can still clock in/out, but your location won't be recorded. 
              Enable location in browser settings for accurate tracking.
            </AlertDescription>
          </Alert>
        )}

        {/* Offline Warning */}
        {!isOnline && (
          <Alert className="border-red-200 bg-red-50">
            <WifiOff className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              You're offline. Please check your internet connection to clock in/out.
            </AlertDescription>
          </Alert>
        )}

        {/* Today's Status */}
        {todayAttendance && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium text-center">Today's Activity</h4>
            <div className="space-y-2">
              {todayAttendance.check_in_time && (
                <div className="flex justify-between items-center p-2 bg-background rounded">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Clock In
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {format(new Date(todayAttendance.check_in_time), 'HH:mm:ss')}
                  </Badge>
                </div>
              )}
              
              {todayAttendance.check_out_time && (
                <>
                  <div className="flex justify-between items-center p-2 bg-background rounded">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Clock Out
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {format(new Date(todayAttendance.check_out_time), 'HH:mm:ss')}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                    <span className="text-sm text-green-700 font-medium">Total Hours</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 font-mono">
                      {Number(todayAttendance.hours_worked || todayAttendance.total_hours || 0).toFixed(2)}h
                    </Badge>
                  </div>

                  {Number(todayAttendance.overtime_hours || 0) > 0 && (
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
                      <span className="text-sm text-blue-700 font-medium">Overtime</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-mono">
                        {Number(todayAttendance.overtime_hours || 0).toFixed(2)}h
                      </Badge>
                    </div>
                  )}
                </>
              )}

              {/* Elapsed Time for Active Session */}
              {canClockOut && (
                <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-sm text-green-700 font-medium">Elapsed Time</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 font-mono">
                    {getElapsedTime()}
                  </Badge>
                </div>
              )}

              {/* Location Info */}
              {todayAttendance.location && (
                <div className="flex items-start gap-2 p-2 bg-background rounded text-xs text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="break-all">{todayAttendance.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {canClockIn && (
            <Button 
              onClick={handleClockIn} 
              disabled={loading || !isOnline}
              className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {fetchingLocation ? 'Getting Location...' : 'Clocking In...'}
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 mr-2" />
                  Clock In
                </>
              )}
            </Button>
          )}

          {canClockOut && (
            <Button 
              onClick={handleClockOut} 
              disabled={loading || !isOnline}
              variant="destructive"
              className="w-full h-14 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {fetchingLocation ? 'Getting Location...' : 'Clocking Out...'}
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 mr-2" />
                  Clock Out
                </>
              )}
            </Button>
          )}

          {isCompleted && (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-green-800 font-medium">Day Complete!</p>
              <p className="text-sm text-green-600">
                You worked {Number(todayAttendance?.hours_worked || todayAttendance?.total_hours || 0).toFixed(2)} hours today
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClockInOut;
