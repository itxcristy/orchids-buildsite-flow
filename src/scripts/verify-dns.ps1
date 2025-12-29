# ============================================================================
# PowerShell Script to Verify DNS Configuration
# ============================================================================
# Run this on Windows to check if DNS is correctly configured

$Domain = "dezignbuild.site"
$ExpectedIP = "72.61.243.152"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "DNS Verification for $Domain" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check main domain
Write-Host "Checking main domain ($Domain)..." -ForegroundColor Yellow
try {
    $Result = Resolve-DnsName -Name $Domain -Type A -ErrorAction Stop
    $CurrentIP = $Result[0].IPAddress
    
    if ($CurrentIP -eq $ExpectedIP) {
        Write-Host "Domain $Domain correctly points to $ExpectedIP" -ForegroundColor Green
    } else {
        Write-Host "Domain $Domain points to $CurrentIP, expected $ExpectedIP" -ForegroundColor Red
        Write-Host "Please update DNS A record in Namecheap!" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "Domain $Domain is not resolving" -ForegroundColor Red
    Write-Host "DNS may not have propagated yet, or A record is missing" -ForegroundColor Yellow
    exit 1
}

# Check www subdomain
Write-Host ""
Write-Host "Checking www subdomain (www.$Domain)..." -ForegroundColor Yellow
try {
    $WWWResult = Resolve-DnsName -Name "www.$Domain" -Type A -ErrorAction Stop
    $WWWIP = $WWWResult[0].IPAddress
    
    if ($WWWIP -eq $ExpectedIP) {
        Write-Host "www.$Domain correctly points to $ExpectedIP" -ForegroundColor Green
    } else {
        Write-Host "www.$Domain points to $WWWIP, expected $ExpectedIP" -ForegroundColor Red
        Write-Host "Please add A record for www pointing to $ExpectedIP" -ForegroundColor Yellow
    }
} catch {
    Write-Host "www.$Domain is not resolving" -ForegroundColor Yellow
    Write-Host "Add A record for www pointing to $ExpectedIP" -ForegroundColor Yellow
}

# Check nameservers
Write-Host ""
Write-Host "Checking nameservers..." -ForegroundColor Yellow
try {
    $NSResult = Resolve-DnsName -Name $Domain -Type NS -ErrorAction Stop
    $NameServers = $NSResult | ForEach-Object { $_.NameHost }
    
    $HasParking = $NameServers | Where-Object { $_ -like "*dns-parking.com*" }
    $HasHostinger = $NameServers | Where-Object { $_ -like "*hostinger.com*" }
    
    if ($HasParking) {
        Write-Host "Nameservers still pointing to parking nameservers!" -ForegroundColor Red
        Write-Host "If using Namecheap DNS: Set nameservers to Namecheap BasicDNS" -ForegroundColor Yellow
        Write-Host "If using Hostinger: Change nameservers in Namecheap to:" -ForegroundColor Yellow
        Write-Host "  ns1.dns.hostinger.com" -ForegroundColor Yellow
        Write-Host "  ns2.dns.hostinger.com" -ForegroundColor Yellow
        Write-Host "  ns3.dns.hostinger.com" -ForegroundColor Yellow
        Write-Host "  ns4.dns.hostinger.com" -ForegroundColor Yellow
    } elseif ($HasHostinger) {
        Write-Host "Nameservers are correctly set to Hostinger" -ForegroundColor Green
    } else {
        Write-Host "Could not verify nameservers" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not check nameservers" -ForegroundColor Yellow
}

# Test HTTP connection
Write-Host ""
Write-Host "Testing HTTP connection..." -ForegroundColor Yellow
try {
    $Response = Invoke-WebRequest -Uri "http://$Domain" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($Response.StatusCode -eq 200 -or $Response.StatusCode -eq 301 -or $Response.StatusCode -eq 302) {
        Write-Host "HTTP connection to $Domain is working" -ForegroundColor Green
    } else {
        Write-Host "HTTP connection returned status $($Response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "HTTP connection to $Domain failed" -ForegroundColor Yellow
    Write-Host "This may be normal if DNS just propagated - wait a few minutes" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor White
Write-Host "Current IP: $CurrentIP" -ForegroundColor White
Write-Host "Expected IP: $ExpectedIP" -ForegroundColor White
Write-Host ""

if ($CurrentIP -eq $ExpectedIP) {
    Write-Host "DNS is correctly configured!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. SSH into server: ssh root@$ExpectedIP" -ForegroundColor White
    Write-Host "2. Run: cd /docker/buildflow; ./scripts/setup-domain-complete.sh" -ForegroundColor White
    Write-Host "3. Test: curl http://$Domain" -ForegroundColor White
    Write-Host "4. Set up SSL: certbot --nginx -d $Domain -d www.$Domain" -ForegroundColor White
} else {
    Write-Host "DNS needs to be fixed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Action required:" -ForegroundColor Yellow
    Write-Host "1. Log in to Namecheap (your domain registrar)" -ForegroundColor White
    Write-Host "2. Go to Domain List -> Manage -> Advanced DNS" -ForegroundColor White
    Write-Host "3. Update A record for @ to point to $ExpectedIP" -ForegroundColor White
    Write-Host "4. Add A record for www pointing to $ExpectedIP" -ForegroundColor White
    Write-Host "5. Delete any records pointing to 84.32.84.32" -ForegroundColor White
    Write-Host "6. Wait 1-2 hours for DNS propagation" -ForegroundColor White
    Write-Host "7. Run this script again to verify" -ForegroundColor White
    Write-Host ""
    Write-Host "See NAMECHEAP_DNS_SETUP.md for detailed instructions" -ForegroundColor Cyan
}
