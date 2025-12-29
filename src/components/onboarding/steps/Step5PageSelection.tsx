/**
 * Step 5: Dynamic Page Selection - Improved UX
 * Template-based selection with simplified interface to reduce decision fatigue
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
// Using simple state-based collapsible instead of Radix UI to avoid dependency issues
import { 
  Search, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Zap, 
  Package, 
  Settings,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square
} from 'lucide-react';
import { usePageRecommendations } from '@/hooks/usePageRecommendations';
import { getApiBaseUrl } from '@/config/api';
import { logError } from '@/utils/consoleLogger';
import type { OnboardingFormData, SelectedPage } from '../hooks/useOnboardingState';
import type { RecommendedPage, PageCategory } from '@/types/pageCatalog';

type TemplateType = 'quick-start' | 'recommended' | 'full-suite' | 'custom';

interface Step5Props {
  formData: OnboardingFormData;
  selectedPages: SelectedPage[];
  setSelectedPages: (pages: SelectedPage[]) => void;
  recommendations: any;
  setRecommendations: (recs: any) => void;
  onNext: () => void;
}

export default function Step5PageSelection({
  formData,
  selectedPages,
  setSelectedPages,
  recommendations,
  setRecommendations,
  onNext
}: Step5Props) {
  const { getRecommendations, loading } = usePageRecommendations();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<PageCategory>>(new Set());
  const [allPages, setAllPages] = useState<RecommendedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch recommendations when step loads
  useEffect(() => {
    // Validate that all required fields are present and not empty
    const hasValidCriteria = 
      formData.industry && 
      formData.industry.trim() !== '' &&
      formData.companySize && 
      formData.companySize.trim() !== '' &&
      formData.primaryFocus && 
      formData.primaryFocus.trim() !== '';
    
    if (hasValidCriteria) {
      const fetchRecs = async () => {
        try {
          setError(null);
          const recs = await getRecommendations({
            industry: formData.industry.trim(),
            company_size: formData.companySize.trim(),
            primary_focus: formData.primaryFocus.trim(),
            business_goals: formData.businessGoals || []
          });
          setRecommendations(recs);
          setAllPages(recs.all || []);
          
          // Auto-select required pages initially
          const requiredPages = recs.categorized?.required || [];
          const autoSelected = requiredPages.map((p: RecommendedPage) => ({
            id: p.id,
            path: p.path,
            title: p.title,
            category: p.category,
            base_cost: p.base_cost
          }));
          setSelectedPages(autoSelected);
          
          // Auto-select "Recommended" template if we have recommendations
          if (recs.categorized?.recommended?.length > 0) {
            setSelectedTemplate('recommended');
            applyTemplate('recommended', recs);
          } else {
            setSelectedTemplate('quick-start');
          }
        } catch (error: any) {
          logError('Error fetching recommendations:', error);
          const errorMessage = error?.message || 'Failed to load page recommendations';
          
          // Set empty recommendations structure if error occurs
          const emptyRecs = {
            all: [],
            categorized: {
              required: [],
              recommended: [],
              optional: []
            },
            summary: {
              total: 0,
              required: 0,
              recommended: 0,
              optional: 0
            }
          };
          setRecommendations(emptyRecs);
          setAllPages([]);
          
          if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
            setError('Backend server is not running. Please start the backend server on port 3000 to continue.');
          } else if (errorMessage.includes('does not exist') || errorMessage.includes('MISSING_TABLES')) {
            setError('Page catalog tables not found. Please run database migrations.');
          } else {
            setError(`Error loading pages: ${errorMessage}`);
          }
        }
      };
      fetchRecs();
    }
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    setError(null);
    try {
      const recs = await getRecommendations({
        industry: formData.industry,
        company_size: formData.companySize,
        primary_focus: formData.primaryFocus,
        business_goals: formData.businessGoals || []
      });
      setRecommendations(recs);
      setAllPages(recs.all || []);
      
      const requiredPages = recs.categorized?.required || [];
      const autoSelected = requiredPages.map((p: RecommendedPage) => ({
        id: p.id,
        path: p.path,
        title: p.title,
        category: p.category,
        base_cost: p.base_cost
      }));
      setSelectedPages(autoSelected);
      
      if (recs.categorized?.recommended?.length > 0) {
        setSelectedTemplate('recommended');
        applyTemplate('recommended', recs);
      } else {
        setSelectedTemplate('quick-start');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load page recommendations';
      if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
        setError('Backend server is not running. Please start the backend server on port 3000 to continue.');
      } else {
        setError(`Error loading pages: ${errorMessage}`);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const requiredPages = recommendations?.categorized?.required || [];
  const recommendedPages = recommendations?.categorized?.recommended || [];
  const optionalPages = recommendations?.categorized?.optional || [];

  // Apply template selection
  const applyTemplate = (template: TemplateType, recs?: any) => {
    const rec = recs || recommendations;
    if (!rec) return;

    let pagesToSelect: RecommendedPage[] = [];

    switch (template) {
      case 'quick-start':
        // Only required pages
        pagesToSelect = rec.categorized?.required || [];
        break;
      case 'recommended':
        // Required + Recommended
        pagesToSelect = [
          ...(rec.categorized?.required || []),
          ...(rec.categorized?.recommended || [])
        ];
        break;
      case 'full-suite':
        // All pages
        pagesToSelect = rec.all || [];
        break;
      case 'custom':
        // Keep current selection
        return;
    }

    const selected = pagesToSelect.map((p: RecommendedPage) => ({
      id: p.id,
      path: p.path,
      title: p.title,
      category: p.category,
      base_cost: p.base_cost
    }));
    setSelectedPages(selected);
  };

  const handleTemplateSelect = (template: TemplateType) => {
    setSelectedTemplate(template);
    applyTemplate(template);
  };

  const togglePage = (page: RecommendedPage) => {
    const isSelected = selectedPages.some(p => p.id === page.id);
    if (isSelected) {
      setSelectedPages(selectedPages.filter(p => p.id !== page.id));
      // If deselecting, switch to custom
      if (selectedTemplate !== 'custom') {
        setSelectedTemplate('custom');
      }
    } else {
      setSelectedPages([
        ...selectedPages,
        {
          id: page.id,
          path: page.path,
          title: page.title,
          category: page.category,
          base_cost: page.base_cost
        }
      ]);
      // If selecting manually, switch to custom
      if (selectedTemplate !== 'custom') {
        setSelectedTemplate('custom');
      }
    }
  };

  const toggleCategory = (category: PageCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group pages by category
  const pagesByCategory = useMemo(() => {
    const grouped: Record<PageCategory, RecommendedPage[]> = {} as any;
    
    [...requiredPages, ...recommendedPages, ...optionalPages].forEach((page: RecommendedPage) => {
      if (!grouped[page.category]) {
        grouped[page.category] = [];
      }
      grouped[page.category].push(page);
    });

    return grouped;
  }, [requiredPages, recommendedPages, optionalPages]);

  // Get category display info
  const getCategoryInfo = (category: PageCategory) => {
    const categoryMap: Record<PageCategory, { label: string; icon: any; color: string }> = {
      dashboard: { label: 'Dashboard', icon: Sparkles, color: 'text-blue-500' },
      projects: { label: 'Projects', icon: Package, color: 'text-green-500' },
      finance: { label: 'Finance', icon: CheckCircle2, color: 'text-emerald-500' },
      hr: { label: 'HR & People', icon: CheckCircle2, color: 'text-purple-500' },
      management: { label: 'Management', icon: Settings, color: 'text-orange-500' },
      reports: { label: 'Reports', icon: CheckCircle2, color: 'text-indigo-500' },
      personal: { label: 'Personal', icon: CheckCircle2, color: 'text-pink-500' },
      settings: { label: 'Settings', icon: Settings, color: 'text-gray-500' },
      system: { label: 'System', icon: Settings, color: 'text-slate-500' },
      inventory: { label: 'Inventory', icon: Package, color: 'text-cyan-500' },
      procurement: { label: 'Procurement', icon: Package, color: 'text-teal-500' },
      assets: { label: 'Assets', icon: Package, color: 'text-amber-500' },
      workflows: { label: 'Workflows', icon: Zap, color: 'text-violet-500' },
      automation: { label: 'Automation', icon: Zap, color: 'text-rose-500' }
    };
    return categoryMap[category] || { label: category, icon: Package, color: 'text-gray-500' };
  };

  const totalCost = selectedPages.reduce((sum, page) => sum + page.base_cost, 0);
  const totalPages = allPages.length;

  // Filter pages based on search
  const getFilteredPagesInCategory = (pages: RecommendedPage[]) => {
    if (!searchQuery) return pages;
    return pages.filter(page =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getPageStatus = (page: RecommendedPage) => {
    if (requiredPages.some(p => p.id === page.id)) return 'required';
    if (recommendedPages.some(p => p.id === page.id)) return 'recommended';
    return 'optional';
  };

  const selectAllInCategory = (category: PageCategory) => {
    const categoryPages = pagesByCategory[category] || [];
    const newSelected = [...selectedPages];
    
    categoryPages.forEach((page: RecommendedPage) => {
      if (!newSelected.some(p => p.id === page.id)) {
        newSelected.push({
          id: page.id,
          path: page.path,
          title: page.title,
          category: page.category,
          base_cost: page.base_cost
        });
      }
    });
    
    setSelectedPages(newSelected);
    setSelectedTemplate('custom');
  };

  const deselectAllInCategory = (category: PageCategory) => {
    const categoryPages = pagesByCategory[category] || [];
    const categoryPageIds = new Set(categoryPages.map(p => p.id));
    
    // Don't deselect required pages
    const requiredPageIds = new Set(requiredPages.map(p => p.id));
    
    const newSelected = selectedPages.filter(page => {
      if (requiredPageIds.has(page.id)) return true; // Keep required
      return !categoryPageIds.has(page.id);
    });
    
    setSelectedPages(newSelected);
    setSelectedTemplate('custom');
  };

  const isCategoryFullySelected = (category: PageCategory) => {
    const categoryPages = pagesByCategory[category] || [];
    if (categoryPages.length === 0) return false;
    return categoryPages.every(page => selectedPages.some(p => p.id === page.id));
  };

  const isCategoryPartiallySelected = (category: PageCategory) => {
    const categoryPages = pagesByCategory[category] || [];
    if (categoryPages.length === 0) return false;
    const selectedCount = categoryPages.filter(page => 
      selectedPages.some(p => p.id === page.id)
    ).length;
    return selectedCount > 0 && selectedCount < categoryPages.length;
  };

  // Show error state
  if (error && allPages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Choose Your Pages</h2>
          <p className="text-muted-foreground text-lg">
            All pages shown here are included at <span className="font-semibold text-primary">$0 cost</span> during onboarding. 
            Select the pages you need for your agency.
          </p>
        </div>

        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Unable to Load Pages</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="bg-muted p-4 rounded-lg text-left max-w-2xl">
                  <p className="text-sm font-semibold mb-2">To fix this:</p>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>Open a new terminal window</li>
                    <li>Navigate to the server directory: <code className="bg-background px-2 py-1 rounded">cd server</code></li>
                    <li>Start the backend server: <code className="bg-background px-2 py-1 rounded">npm start</code> or <code className="bg-background px-2 py-1 rounded">npm run dev</code></li>
                    <li>Wait for the message: <code className="bg-background px-2 py-1 rounded">🚀 Server running on port 3000</code></li>
                    <li>Click the Retry button below</li>
                  </ol>
                </div>
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying || loading}
                  className="mt-4"
                >
                  {isRetrying || loading ? 'Loading...' : 'Retry'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (loading && allPages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">Choose Your Pages</h2>
          <p className="text-muted-foreground text-lg">
            All pages shown here are included at <span className="font-semibold text-primary">$0 cost</span> during onboarding. 
            Select the pages you need for your agency.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading page recommendations...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Choose Your Pages</h2>
        <p className="text-muted-foreground text-lg">
          All pages shown here are included at <span className="font-semibold text-primary">$0 cost</span> during onboarding. 
          Select the pages you need for your agency.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRetry}
                disabled={isRetrying}
                className="ml-auto h-6 px-2 text-xs"
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Template Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className={`cursor-pointer transition-all ${
              selectedTemplate === 'quick-start'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleTemplateSelect('quick-start')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-base">Quick Start</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Essential pages only ({requiredPages.length} pages)
              </CardDescription>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                ${requiredPages.reduce((sum, p) => sum + p.base_cost, 0).toFixed(2)}/mo
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedTemplate === 'recommended'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleTemplateSelect('recommended')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Recommended</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Best for your agency ({requiredPages.length + recommendedPages.length} pages)
              </CardDescription>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                ${(requiredPages.reduce((sum, p) => sum + p.base_cost, 0) + 
                    recommendedPages.reduce((sum, p) => sum + p.base_cost, 0)).toFixed(2)}/mo
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedTemplate === 'full-suite'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleTemplateSelect('full-suite')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">Full Suite</CardTitle>
              </div>
              <CardDescription className="text-sm">
                All available pages ({totalPages} pages)
              </CardDescription>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                ${totalCost.toFixed(2)}/mo
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              selectedTemplate === 'custom'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'hover:border-primary/50'
            }`}
            onClick={() => handleTemplateSelect('custom')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-base">Custom</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Choose your own ({selectedPages.length} selected)
              </CardDescription>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                ${totalCost.toFixed(2)}/mo
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-primary">{selectedPages.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Pages Selected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">$0</div>
            <div className="text-sm text-muted-foreground mt-1">One-time Setup Cost</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">${totalCost.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground mt-1">Monthly Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pages by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pages by Category */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pages by Category</h3>
        
        {Object.keys(pagesByCategory).length === 0 && !loading && !error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pages Available</h3>
                <p className="text-muted-foreground mb-4">
                  No pages were found in the catalog. Please check the backend server configuration.
                </p>
                <Button onClick={handleRetry} variant="outline">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          Object.entries(pagesByCategory).map(([category, pages]) => {
          const categoryInfo = getCategoryInfo(category as PageCategory);
          const Icon = categoryInfo.icon;
          const filteredPages = getFilteredPagesInCategory(pages);
          const isExpanded = expandedCategories.has(category as PageCategory);
          const isFullySelected = isCategoryFullySelected(category as PageCategory);
          const isPartiallySelected = isCategoryPartiallySelected(category as PageCategory);
          
          if (filteredPages.length === 0 && searchQuery) return null;

          return (
            <Card key={category}>
              <CardHeader 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => toggleCategory(category as PageCategory)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${categoryInfo.color}`} />
                    <div className="text-left">
                      <CardTitle className="text-base">{categoryInfo.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                        {filteredPages.length !== pages.length && searchQuery && (
                          <span className="ml-1">({filteredPages.length} match search)</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isFullySelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : isPartiallySelected ? (
                        <Square className="h-4 w-4 text-primary" />
                      ) : null}
                      <span className="text-sm text-muted-foreground">
                        {filteredPages.filter(p => selectedPages.some(sp => sp.id === p.id)).length} / {filteredPages.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  {/* Bulk Actions */}
                  <div className="flex gap-2 mb-4 pb-4 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFullySelected) {
                          deselectAllInCategory(category as PageCategory);
                        } else {
                          selectAllInCategory(category as PageCategory);
                        }
                      }}
                    >
                      {isFullySelected ? 'Deselect All' : 'Select All'} in {categoryInfo.label}
                    </Button>
                  </div>

                  {/* Pages Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredPages.map((page: RecommendedPage) => {
                      const isSelected = selectedPages.some(p => p.id === page.id);
                      const status = getPageStatus(page);
                      
                      return (
                        <Card
                          key={page.id}
                          className={`cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => togglePage(page)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={isSelected} 
                                className="mt-1"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1 gap-2">
                                  <h4 className="font-semibold text-sm truncate">{page.title}</h4>
                                  {status === 'required' && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                  {status === 'recommended' && (
                                    <Badge variant="default" className="text-xs">Recommended</Badge>
                                  )}
                                </div>
                                {page.description && (
                                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                    {page.description}
                                  </p>
                                )}
                                {status === 'recommended' && page.reasoning && page.reasoning.length > 0 && (
                                  <div className="text-xs text-blue-600 mb-2 italic">
                                    💡 {page.reasoning[0]}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="capitalize">{page.category}</span>
                                  <span className="font-medium">${page.base_cost.toFixed(2)}/mo</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t sticky bottom-0 bg-background z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">
              {selectedPages.length} {selectedPages.length === 1 ? 'page' : 'pages'} selected
            </div>
            <div className="text-sm text-muted-foreground">
              Total monthly value: <span className="font-semibold text-primary">${totalCost.toFixed(2)}</span>
              {' • '}
              <span className="text-green-600 font-semibold">Free during onboarding</span>
            </div>
          </div>
          <Button
            onClick={onNext}
            size="lg"
            disabled={selectedPages.length === 0}
            className="min-w-[120px]"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

