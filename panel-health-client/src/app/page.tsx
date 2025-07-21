"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SurveyCard } from '@/components/ui/SurveyCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { surveyAPI } from '@/lib/api';
import { Loader2, Info } from 'lucide-react';
import type { Survey } from '@/data/dummySurveys';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLoading } from '@/contexts/LoadingContext';
import { useAuth } from '@/contexts/AuthContext';

interface EnrichedSurvey extends Survey {
  uxScore: number;
  contributions: {
    userRating: number;
    sentiment: number;
    dropoff: number;
    screenout: number;
    questionCount: number;
  };
}

export default function DashboardPage() {
  console.log('🔄 DashboardPage: Component rendering');
  
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [filter, setFilter] = useState("top5");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  
  // Track if login has been attempted to prevent infinite re-renders
  const loginAttemptedRef = useRef(false);
  
  // Handle filter change with state reset
  const handleFilterChange = (newFilter: string) => {
    console.log(`🔄 FILTER CHANGING: ${filter} → ${newFilter}`);
    setFilter(newFilter);
    // Reset expanded state when filter changes to prevent stale data
    setExpanded(null);
  };

  // Global loading context - temporarily disabled to prevent re-renders
  // const { setLoadingTracker } = useLoading();

  useEffect(() => {
    console.log('🔄 DashboardPage: Component mounted');
    isMountedRef.current = true;
    loginAttemptedRef.current = false; // Reset login attempt on mount
    
    return () => {
      console.log('🔄 DashboardPage: Component unmounting');
      isMountedRef.current = false;
      loginAttemptedRef.current = false; // Reset login attempt on unmount
    };
  }, []);

  // Handle authentication redirect in render logic instead of useEffect to prevent infinite re-renders
  if (!authLoading && !isAuthenticated && process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true' && !loginAttemptedRef.current) {
    console.log('🔐 User not authenticated, redirecting to login');
    loginAttemptedRef.current = true;
    login();
    return null; // Return null to prevent rendering while redirecting
  }

  // Show loading while checking authentication (skip in dev mode)
  if (authLoading && process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated (skip in dev mode)
  if (!isAuthenticated && process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Fetch surveys from API
  useEffect(() => {
    console.log('🔄 DashboardPage: Survey fetching useEffect running', { 
      isMounted: isMountedRef.current,
      surveysLength: surveys.length,
      authLoading,
      isAuthenticated
    });
    
    // Only run if component is mounted and authentication is stable
    if (!isMountedRef.current) {
      console.log('🔄 DashboardPage: Survey fetching useEffect skipped - not mounted');
      return;
    }
    
    // Skip if authentication is still loading or not authenticated
    if (authLoading || !isAuthenticated) {
      console.log('🔄 DashboardPage: Survey fetching useEffect skipped - auth not ready');
      return;
    }
    
    let timeoutId: NodeJS.Timeout | null = null;
    let controller: AbortController | null = null;
    
    const fetchSurveys = async () => {
      try {
        if (!isMountedRef.current) return;
        setIsLoading(true);
        if (!isMountedRef.current) return;
        setError(null);
        if (!isMountedRef.current) return;
        // setLoadingTracker("survey"); // Temporarily disabled
        
        // First, test if backend is reachable
        console.log('🏥 FRONTEND: Testing backend connectivity...');
        try {
          const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/surveys/health`);
          const healthData = await healthResponse.json();
          console.log('✅ FRONTEND: Backend health check successful:', healthData);
        } catch (healthError) {
          console.error('❌ FRONTEND: Backend health check failed:', healthError);
          throw new Error('Backend server is not reachable');
        }
        
        console.log('🌐 FRONTEND: Making API call to getAllSurveys...');
        let surveyData = [];
        try {
          // Add timeout for full dataset processing (optimized - should be much faster now)
          controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout
          
          console.log('⏱️ FRONTEND: Starting API call with 5-minute timeout (optimized processing)...');
          
          // Use the full survey API with Bayesian smoothing
          const response = await surveyAPI.getAllSurveys();
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          console.log('⏱️ FRONTEND: API call completed within timeout');
          console.log('📥 FRONTEND: API response received:', response);
          surveyData = (response as any).data || [];
          console.log('📊 FRONTEND: Survey data extracted:', surveyData.length, 'surveys');
                  console.log('📊 FRONTEND: Processing complete dataset for accurate Bayesian analysis');
        if (isMountedRef.current) {
          setSurveys(surveyData);
        }
        } catch (apiError: unknown) {
          console.error('❌ FRONTEND: API call failed:', apiError);
          console.error('❌ FRONTEND: Error details:', {
            message: apiError instanceof Error ? apiError.message : 'Unknown error',
            stack: apiError instanceof Error ? apiError.stack : undefined
          });
          throw apiError; // Re-throw to be caught by outer try-catch
        }
        
        // Console logging for data fetch
        console.log('📊 SURVEY DATA FETCHED:', {
          totalSurveys: surveyData.length,
          timestamp: new Date().toISOString()
        });
        
        // Debug: Check survey data structure
        if (surveyData.length > 0) {
          console.log('🔍 FRONTEND: Sample survey keys:', Object.keys(surveyData[0]));
          console.log('🔍 FRONTEND: Sample survey experienceScore:', surveyData[0].experienceScore);
          console.log('🔍 FRONTEND: Sample survey xscore:', surveyData[0].xscore);
          console.log('🔍 FRONTEND: Sample survey userRating:', surveyData[0].userRating);
          console.log('🔍 FRONTEND: Sample survey userSentiment:', surveyData[0].userSentiment);
          
          // SPECIFIC DEBUGGING FOR CRM ID 1187 MISMATCH
          console.log('\n🔍 FRONTEND: DEBUGGING CRM ID 1187 MISMATCH:');
          console.log('='.repeat(50));
          
          // Find all surveys with CRM ID 1187
          const crmId1187Surveys = surveyData.filter(s => s.crmId === '1187' || s.crmId === 1187);
          console.log(`🔍 FRONTEND: Found ${crmId1187Surveys.length} surveys with CRM ID 1187:`);
          
                crmId1187Surveys.forEach((survey: EnrichedSurvey, index: number) => {
        console.log(`  ${index + 1}. Survey ID: ${survey.id}`);
        console.log(`     - Title: ${survey.surveyTitle}`);
        console.log(`     - XScore: ${survey.xscore}`);
        console.log(`     - Legacy Score: ${survey.experienceScore}`);
        console.log(`     - User Rating: ${survey.userRating}`);
        console.log(`     - User Sentiment: ${survey.userSentiment}`);
        console.log(`     - Dropoff: ${survey.dropOffPercent}%`);
        console.log(`     - Screenout: ${survey.screenOutPercent}%`);
        if (survey.breakdown) {
          console.log(`     - Breakdown: Rating=${survey.breakdown.userRating?.value}, Sentiment=${survey.breakdown.userSentiment?.value}`);
        }
        console.log('');
      });
          
          // Check first 3 surveys in API response order
          console.log('\n🔍 FRONTEND: FIRST 3 SURVEYS IN API RESPONSE ORDER:');
          surveyData.slice(0, 3).forEach((survey, index) => {
            console.log(`  ${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | XScore: ${survey.xscore} | Title: ${survey.surveyTitle?.substring(0, 50)}...`);
          });
          
          console.log('='.repeat(50));
        }
        
              } catch (err: unknown) {
          console.error('Error fetching surveys:', err);
          if (isMountedRef.current) {
            setError(err instanceof Error ? err.message : 'An error occurred');
          }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          // setLoadingTracker(null); // Temporarily disabled
        }
      }
    };

    fetchSurveys();

    // Cleanup function - This is what was missing!
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (controller) {
        controller.abort();
      }
    };
  }, [authLoading, isAuthenticated]); // Add auth dependencies to run when auth is stable

  const enrichedSurveys = useMemo(() => {
    console.log('🔄 FRONTEND: Processing surveys (display only - no calculations)...');
    console.log('🔄 FRONTEND: Total surveys to process:', surveys.length);
    
    const processed = surveys.map(survey => {
      // Use backend XScore as primary score, fallback to legacy only if completely missing
      const uxScore = survey.xscore !== null && survey.xscore !== undefined && !isNaN(survey.xscore) 
        ? survey.xscore 
        : (survey.experienceScore || 0);
      
      // Use backend breakdown data ONLY - no frontend calculations
      const userRating = survey.breakdown?.userRating?.contribution ?? 0;
      const sentiment = survey.breakdown?.userSentiment?.contribution ?? 0;
      const dropoff = survey.breakdown?.dropoffRate?.contribution ?? 0;
      const screenout = survey.breakdown?.screenoutRate?.contribution ?? 0;
      const questionCount = survey.breakdown?.screenerQuestionCount?.contribution ?? 0;
      
      // Log backend data for debugging
      if (survey.breakdown) {
        console.log(`🔍 SURVEY ${survey.id}: Backend breakdown data:`, {
          userRating: typeof userRating === 'number' ? userRating.toFixed(2) : 'N/A',
          sentiment: typeof sentiment === 'number' ? sentiment.toFixed(2) : 'N/A',
          dropoff: typeof dropoff === 'number' ? dropoff.toFixed(2) : 'N/A',
          screenout: typeof screenout === 'number' ? screenout.toFixed(2) : 'N/A',
          questionCount: typeof questionCount === 'number' ? questionCount.toFixed(2) : 'N/A'
        });
      } else {
        console.warn(`⚠️  SURVEY ${survey.id}: No backend breakdown data available`);
      }
      
      return {
        ...survey,
        uxScore,
        contributions: {
          userRating,
          sentiment,
          dropoff,
          screenout,
          questionCount,
        }
      };
    });
    
    console.log('✅ FRONTEND: Survey processing complete (backend data only)');
    console.log('📊 FRONTEND: Sample survey uxScore:', processed[0]?.uxScore);
    
    return processed;
  }, [surveys]);

  // Process and validate surveys once
  const validSurveys = useMemo(() => {
    // First, handle surveys with null CRM IDs by generating unique IDs
    const processedSurveys = enrichedSurveys.map((survey, index) => {
      if (!survey.crmId || survey.crmId === 'null' || survey.crmId === null) {
        return {
          ...survey,
          crmId: `null-${index}` // Generate unique ID for null CRM surveys
        };
      }
      return survey;
    });
    
    // Filter out surveys with invalid UX scores
    const valid = processedSurveys.filter(survey => 
      typeof survey.uxScore === 'number' && 
      !isNaN(survey.uxScore)
    );
    
    console.log(`🔍 VALID SURVEYS: ${valid.length} out of ${enrichedSurveys.length} total`);
    
    if (valid.length === 0) {
      console.log('🚨 FRONTEND: NO VALID SURVEYS FOUND!');
      console.log('First 3 processed surveys:');
      processedSurveys.slice(0, 3).forEach((s: EnrichedSurvey, i: number) => {
        console.log(`  Survey ${i + 1}:`, {
          id: s.id,
          uxScore: s.uxScore,
          xscore: s.xscore,
          experienceScore: s.experienceScore
        });
      });
    }
    
    // Log surveys that were filtered out
    const invalidSurveys = processedSurveys.filter((survey: EnrichedSurvey) => 
      typeof survey.uxScore !== 'number' || 
      isNaN(survey.uxScore)
    );
    
    if (invalidSurveys.length > 0) {
      console.log('🚫 INVALID SURVEYS FILTERED OUT:', invalidSurveys.map((s: EnrichedSurvey) => ({
        id: s.id,
        crmId: s.crmId,
        title: s.surveyTitle,
        uxScore: s.uxScore
      })));
    }
    
    return valid;
  }, [enrichedSurveys]);

  // Calculate top 5 surveys using useMemo to prevent unnecessary re-renders
  const top5Surveys = useMemo(() => {
    console.log('🔄 DashboardPage: Top 5 useMemo running', { 
      validSurveysLength: validSurveys.length
    });
    
    const seen = new Set();
    const unique = [];
    
    // Sort by UX score descending (highest first)
    const sortedSurveys = [...validSurveys].sort((a, b) => b.uxScore - a.uxScore);
    
    for (const survey of sortedSurveys) {
      if (unique.length >= 5) break;
      
      // Create a unique key based on survey ID
      const key = survey.id ? `survey-${survey.id}` : `${survey.crmId}-${survey.uxScore}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(survey);
        console.log(`✅ ADDED TO TOP 5: Survey ID ${survey.id} | CRM ${survey.crmId} - ${survey.surveyTitle} (${survey.uxScore.toFixed(2)})`);
      } else {
        console.log(`🚫 DUPLICATE SKIPPED: Survey ID ${survey.id} | CRM ${survey.crmId} - ${survey.surveyTitle} (${survey.uxScore.toFixed(2)})`);
      }
    }
    
    console.log('🏆 TOP 5 SURVEYS CALCULATED:', unique.length);
    return unique;
  }, [validSurveys]);

  // Calculate lowest 5 surveys using useMemo to prevent unnecessary re-renders
  const lowest5Surveys = useMemo(() => {
    console.log('🔄 DashboardPage: Lowest 5 useMemo running', { 
      validSurveysLength: validSurveys.length
    });
    
    const seen = new Set();
    const unique = [];
    
    // Sort by UX score ascending (lowest first)
    const sortedSurveys = [...validSurveys].sort((a, b) => a.uxScore - b.uxScore);
    
    for (const survey of sortedSurveys) {
      if (unique.length >= 5) break;
      
      // Create a unique key based on survey ID
      const key = survey.id ? `survey-${survey.id}` : `${survey.crmId}-${survey.uxScore}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(survey);
        console.log(`✅ ADDED TO LOWEST 5: Survey ID ${survey.id} | CRM ${survey.crmId} - ${survey.surveyTitle} (${survey.uxScore.toFixed(2)})`);
      } else {
        console.log(`🚫 DUPLICATE SKIPPED: Survey ID ${survey.id} | CRM ${survey.crmId} - ${survey.surveyTitle} (${survey.uxScore.toFixed(2)})`);
      }
    }
    
    console.log('📉 LOWEST 5 SURVEYS CALCULATED:', unique.length);
    return unique;
  }, [validSurveys]);

  // Select the appropriate list based on filter
  const filteredSurveys = useMemo(() => {
    console.log('='.repeat(80));
    console.log('📊 SURVEY RANKINGS UPDATE:', new Date().toLocaleTimeString());
    console.log('='.repeat(80));
    
    // Console logging for top 5 surveys
    console.log('🏆 TOP 5 SURVEYS:');
    let totalUXScore = 0;
    let bayesianCount = 0;
    top5Surveys.forEach((survey, index) => {
      totalUXScore += survey.uxScore;
      if (survey.xscore !== null && survey.xscore !== undefined) bayesianCount++;
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Bayesian XScore: ${survey.xscore?.toFixed(2) || 'N/A'} | Legacy Score: ${survey.experienceScore?.toFixed(2) || 'N/A'} | Using: ${survey.xscore !== null && survey.xscore !== undefined ? 'Bayesian' : 'Legacy'}`);
      
      // SPECIFIC DEBUGGING FOR CRM ID 1187
      if (survey.crmId === '1187' || survey.crmId === 1187) {
        console.log(`   🚨 CRM ID 1187 FOUND IN TOP 5 (Position ${index + 1}):`);
        console.log(`      - Survey ID: ${survey.id}`);
        console.log(`      - Frontend UX Score: ${survey.uxScore.toFixed(2)}`);
        console.log(`      - Backend XScore: ${survey.xscore?.toFixed(2) || 'N/A'}`);
        console.log(`      - User Rating (Frontend): ${survey.userRating}`);
        console.log(`      - User Sentiment (Frontend): ${survey.userSentiment}`);
        console.log(`      - Dropoff % (Frontend): ${survey.dropOffPercent}`);
        console.log(`      - Screenout % (Frontend): ${survey.screenOutPercent}`);
        if (survey.breakdown) {
          console.log(`      - Backend Breakdown Rating Value: ${survey.breakdown.userRating?.value}`);
          console.log(`      - Backend Breakdown Sentiment Value: ${survey.breakdown.userSentiment?.value}`);
          console.log(`      - Backend Breakdown Rating Contribution: ${survey.breakdown.userRating?.contribution}`);
          console.log(`      - Backend Breakdown Sentiment Contribution: ${survey.breakdown.userSentiment?.contribution}`);
          console.log(`      - Backend Breakdown Dropoff Contribution: ${survey.breakdown.dropoffRate?.contribution}`);
          console.log(`      - Backend Breakdown Screenout Contribution: ${survey.breakdown.screenoutRate?.contribution}`);
        }
        console.log(`      - Frontend Contributions: Rating=${survey.contributions.userRating.toFixed(2)}, Sentiment=${survey.contributions.sentiment.toFixed(2)}, Dropoff=${survey.contributions.dropoff.toFixed(2)}, Screenout=${survey.contributions.screenout.toFixed(2)}, Questions=${survey.contributions.questionCount.toFixed(2)}`);
      }
      
      // Debug contribution breakdown for first 3 surveys
      if (index < 3) {
        const totalContributions = survey.contributions.userRating + survey.contributions.sentiment + survey.contributions.dropoff + survey.contributions.screenout + survey.contributions.questionCount;
        console.log(`   📊 CONTRIBUTIONS: User Rating: ${survey.contributions.userRating.toFixed(2)} | Sentiment: ${survey.contributions.sentiment.toFixed(2)} | Dropoff: ${survey.contributions.dropoff.toFixed(2)} | Screenout: ${survey.contributions.screenout.toFixed(2)} | Questions: ${survey.contributions.questionCount.toFixed(2)} | Total: ${totalContributions.toFixed(2)} | UX Score: ${survey.uxScore.toFixed(2)} | Match: ${Math.abs(totalContributions - survey.uxScore) < 0.1 ? '✅' : '❌'}`);
      }
    });
    console.log(`📊 TOP 5 SUMMARY: Average UX Score: ${(totalUXScore / top5Surveys.length).toFixed(2)} | Using Bayesian: ${bayesianCount}/${top5Surveys.length} surveys`);
    
    // Console logging for lowest 5 surveys
    console.log('📉 LOWEST 5 SURVEYS:');
    lowest5Surveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Bayesian XScore: ${survey.xscore?.toFixed(2) || 'N/A'} | Legacy Score: ${survey.experienceScore?.toFixed(2) || 'N/A'}`);
    });
    
    // Log current filter selection
    console.log(`🎯 CURRENT FILTER: ${filter.toUpperCase()}`);
    
    // Additional debugging for the problematic survey
    const problematicSurvey = enrichedSurveys.find(s => s.crmId === '914' || s.uxScore === 25.6);
    if (problematicSurvey) {
      console.log('🚨 PROBLEMATIC SURVEY FOUND:');
      console.log(`  CRM ID: ${problematicSurvey.crmId}`);
      console.log(`  Title: ${problematicSurvey.surveyTitle}`);
      console.log(`  UX Score: ${problematicSurvey.uxScore}`);
      console.log(`  Backend Score: ${problematicSurvey.experienceScore}`);
      console.log(`  Is in top5: ${top5Surveys.some(s => s.crmId === problematicSurvey.crmId)}`);
      console.log(`  Is in lowest5: ${lowest5Surveys.some(s => s.crmId === problematicSurvey.crmId)}`);
    }
    
    console.log('='.repeat(80));
    
    // Return based on current filter
    let result;
    if (filter === "top5") {
      result = top5Surveys.slice(0, 5); // Ensure exactly 5 surveys
      console.log(`🔍 RETURNING TOP 5: ${result.length} surveys`);
    } else if (filter === "lowest5") {
      result = lowest5Surveys.slice(0, 5); // Ensure exactly 5 surveys
      console.log(`🔍 RETURNING LOWEST 5: ${result.length} surveys`);
    } else {
      result = top5Surveys.slice(0, 5); // Default to top 5
      console.log(`🔍 RETURNING DEFAULT TOP 5: ${result.length} surveys`);
    }
    
    return result;
  }, [filter, top5Surveys, lowest5Surveys, enrichedSurveys]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" role="status" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <main className="w-full pt-8 pb-8 px-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Tabs value={filter} onValueChange={handleFilterChange}>
              <TabsList className="bg-transparent flex gap-2">
                <TabsTrigger value="top5" className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-base">
                  Top 5 Surveys
                </TabsTrigger>
                <TabsTrigger value="lowest5" className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-base">
                  Lowest 5 Surveys
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2">
            <Dialog>
              {isMountedRef.current ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        aria-label="Help"
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:hover:bg-input/50 size-9"
                        data-slot="dialog-trigger"
                        data-state="closed"
                        type="button"
                      >
                        <Info className="h-4 w-4 text-blue-600" aria-label="Info" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8}>
                    How UX Score is Calculated?
                  </TooltipContent>
                </Tooltip>
              ) : (
                <DialogTrigger asChild>
                  <Button
                    aria-label="Help"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:hover:bg-input/50 size-9"
                    data-slot="dialog-trigger"
                    data-state="closed"
                    type="button"
                  >
                    <Info className="h-4 w-4 text-blue-600" aria-label="Info" />
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent style={{ minWidth: 800, minHeight: 480, maxWidth: 900, maxHeight: 700, background: '#fff' }}>
                <DialogHeader>
                  <DialogTitle>How is the UX Score Calculated?</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p><strong>Definition:</strong> The UX Score is a composite metric (0-100) that quantifies the overall respondent experience for each survey, based on user feedback, sentiment, drop-off, screen-out, and screener length.</p>
                  <div>
                    <strong>Terminologies:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><strong>User Rating:</strong> Average user rating (1-10) collected at the end of survey</li>
                      <li><strong>User Sentiment:</strong> Average sentiment score (-1 to 1) based on qualitative feedbacks collected at the end of survey</li>
                      <li><strong>Drop-off %:</strong> Percentage of users who started but did not complete the survey</li>
                      <li><strong>Screen-out %:</strong> Percentage of users who were screened-out from the survey</li>
                      <li><strong># Que in Screener:</strong> Total number of questions shown in the screener section of survey</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Formula:</strong>
                    <div className="bg-muted rounded p-2 my-2 text-xs font-mono">
                      UX Score = User Rating Contribution + Sentiment Contribution + DropoffContribution + ScreenoutContribution + Question Count Contribution<br/>
                      (Clamped to 0-100)
                    </div>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><strong>User Rating Contribution:</strong> normalizedUserRating * 35</li>
                      <li><strong>Sentiment Contribution:</strong> normalizedSentiment * 25</li>
                      <li><strong>Drop-off Contribution:</strong> (100 - dropoffRate) / 100 * 20</li>
                      <li><strong>Screen-out Contribution:</strong> (100 - screenoutRate) / 100 * 15</li>
                      <li><strong>Question Count Contribution:</strong> ((12 - questionCount) / 9) * 5 (if ≤12), else ((12 - questionCount) / 18) * 5</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
                <section>
          
          {/* Survey Cards */}
          <div 
            key={`survey-list-${filter}`} // Force re-render when filter changes
            className="flex flex-col gap-[15px] w-full max-w-6xl mx-auto"
          >
            {filteredSurveys.map((survey, idx) => (
              <SurveyCard
                key={`${filter}-${survey.crmId}-${idx}`} // Unique key for each survey in each filter
                survey={survey}
                expanded={expanded === survey.crmId}
                onExpand={() => setExpanded(expanded === survey.crmId ? null : survey.crmId)}
                cardWidth="100%"
                style={{ 
                  marginTop: idx === 0 ? 0 : undefined, 
                  width: '100%'
                }}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
