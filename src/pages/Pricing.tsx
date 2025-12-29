import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  Zap, 
  ArrowRight,
  Users,
  Building2,
  Crown,
  Star,
  Globe,
  ChevronDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Pricing() {
  const { currency, loading, formatPrice, changeCurrency, availableCurrencies } = useCurrency();
  const plans = [
    {
      name: "Starter",
      price: 29,
      period: "month",
      description: "Perfect for small agencies getting started",
      icon: Zap,
      popular: false,
      features: [
        "Up to 5 team members",
        "10 active projects",
        "Basic project management",
        "Email support",
        "5GB storage",
        "Basic reporting",
        "Mobile app access"
      ]
    },
    {
      name: "Professional",
      price: 79,
      period: "month", 
      description: "Ideal for growing agencies with advanced needs",
      icon: Building2,
      popular: true,
      features: [
        "Up to 25 team members",
        "Unlimited projects",
        "Advanced project management",
        "Priority support",
        "100GB storage",
        "Advanced analytics",
        "Custom integrations",
        "Time tracking",
        "Client portal",
        "API access"
      ]
    },
    {
      name: "Enterprise",
      price: 199,
      period: "month",
      description: "For large agencies requiring maximum control",
      icon: Crown,
      popular: false,
      features: [
        "Unlimited team members",
        "Unlimited projects",
        "Enterprise project management",
        "24/7 dedicated support",
        "Unlimited storage",
        "Custom analytics dashboard",
        "White-label solution",
        "Advanced security",
        "SSO integration",
        "Custom workflows",
        "Dedicated account manager",
        "On-premise deployment"
      ]
    }
  ];

  const featureComparison = [
    {
      category: "Core Features",
      features: [
        { name: "Team Members", starter: "Up to 5", professional: "Up to 25", enterprise: "Unlimited" },
        { name: "Projects", starter: "10 active", professional: "Unlimited", enterprise: "Unlimited" },
        { name: "Storage", starter: "5GB", professional: "100GB", enterprise: "Unlimited" },
        { name: "Mobile App", starter: true, professional: true, enterprise: true },
        { name: "Email Support", starter: true, professional: true, enterprise: true }
      ]
    },
    {
      category: "Project Management",
      features: [
        { name: "Basic Project Tools", starter: true, professional: true, enterprise: true },
        { name: "Advanced Project Tools", starter: false, professional: true, enterprise: true },
        { name: "Custom Workflows", starter: false, professional: false, enterprise: true },
        { name: "Resource Planning", starter: false, professional: true, enterprise: true },
        { name: "Gantt Charts", starter: false, professional: true, enterprise: true }
      ]
    },
    {
      category: "Analytics & Reporting",
      features: [
        { name: "Basic Reports", starter: true, professional: true, enterprise: true },
        { name: "Advanced Analytics", starter: false, professional: true, enterprise: true },
        { name: "Custom Dashboards", starter: false, professional: true, enterprise: true },
        { name: "Real-time Insights", starter: false, professional: true, enterprise: true },
        { name: "White-label Reports", starter: false, professional: false, enterprise: true }
      ]
    },
    {
      category: "Support & Security",
      features: [
        { name: "Priority Support", starter: false, professional: true, enterprise: true },
        { name: "24/7 Support", starter: false, professional: false, enterprise: true },
        { name: "Dedicated Account Manager", starter: false, professional: false, enterprise: true },
        { name: "SSO Integration", starter: false, professional: false, enterprise: true },
        { name: "Advanced Security", starter: false, professional: true, enterprise: true }
      ]
    }
  ];

  const renderFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-primary mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2" aria-label="BuildFlow Home">
              <Zap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">BuildFlow</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/pricing" className="text-foreground font-medium">Pricing</Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Globe className="h-4 w-4" />
                    {currency.code}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.entries(availableCurrencies).map(([countryCode, currencyInfo]) => (
                    <DropdownMenuItem 
                      key={countryCode}
                      onClick={() => changeCurrency(countryCode)}
                      className="cursor-pointer"
                    >
                      {currencyInfo.symbol} {currencyInfo.code} - {currencyInfo.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
              </Link>
              <Link to="/agency-signup">
                <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Choose the perfect plan for your agency. Upgrade or downgrade at any time.
          </p>
          <div className="flex justify-center items-center gap-4 mb-8">
            <Badge variant="secondary" className="px-4 py-2">
              <Star className="w-4 h-4 mr-2" />
              All plans include 14-day free trial
            </Badge>
            {!loading && (
              <Badge variant="outline" className="px-4 py-2">
                <Globe className="w-4 h-4 mr-2" />
                Prices in {currency.name}
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading pricing...</span>
            </div>
          ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    <plan.icon className="h-12 w-12 text-primary mx-auto" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-6">
                    <Link to={`/agency-signup?plan=${plan.name.toLowerCase()}&source=pricing`}>
                      <Button className={`w-full ${plan.popular ? '' : 'variant-outline'}`}>
                        Start Free Trial
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-muted/30 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Compare All Features</h2>
            <p className="text-xl text-muted-foreground">
              Detailed breakdown of what's included in each plan
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {featureComparison.map((category, categoryIndex) => (
              <div key={categoryIndex} className="mb-12">
                <h3 className="text-xl font-semibold mb-6 text-center">{category.category}</h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-4 font-medium">Feature</th>
                            <th className="text-center p-4 font-medium">Starter</th>
                            <th className="text-center p-4 font-medium">Professional</th>
                            <th className="text-center p-4 font-medium">Enterprise</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.features.map((feature, featureIndex) => (
                            <tr key={featureIndex} className="border-b last:border-b-0">
                              <td className="p-4 font-medium">{feature.name}</td>
                              <td className="p-4 text-center">{renderFeatureValue(feature.starter)}</td>
                              <td className="p-4 text-center">{renderFeatureValue(feature.professional)}</td>
                              <td className="p-4 text-center">{renderFeatureValue(feature.enterprise)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of agencies already using BuildFlow to streamline their operations and accelerate growth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/agency-signup?source=pricing-cta">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-primary">
                  Contact Sales
                </Button>
              </div>
              <p className="text-sm opacity-75 mt-4">
                No credit card required • Cancel anytime • 24/7 support
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Zap className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">BuildFlow</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>© 2024 BuildFlow. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}