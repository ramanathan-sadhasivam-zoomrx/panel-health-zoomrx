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

  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [filter, setFilter] = useState("top5");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  
  // Separate state for top 5 and lowest 5 to ensure complete isolation
  const [top5Surveys, setTop5Surveys] = useState<EnrichedSurvey[]>([]);
  const [lowest5Surveys, setLowest5Surveys] = useState<EnrichedSurvey[]>([]);
  
  // Handle filter change with state reset
  const handleFilterChange = (newFilter: string) => {

    setFilter(newFilter);
    // Reset expanded state when filter changes to prevent stale data
    setExpanded(null);
  };

  // Global loading context
  const { setLoadingTracker } = useLoading();

  // --- MOVE ALL HOOKS ABOVE ANY RETURN STATEMENTS ---

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }
    if (process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true') {
      return;
    }
    if (!authLoading && !isAuthenticated && isMountedRef.current) {
      login();
    }
    return () => {
    };
  }, [authLoading, isAuthenticated, login]);

  useEffect(() => {
    if (!isMountedRef.current) {
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
        setLoadingTracker("survey");
        try {
          const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/surveys/health`);
          const healthData = await healthResponse.json();
        } catch (healthError) {
          console.error('❌ FRONTEND: Backend health check failed:', healthError);
          throw new Error('Backend server is not reachable');
        }
        let surveyData: Survey[] = [];
        try {
          controller = new AbortController();
          timeoutId = setTimeout(() => controller!.abort(), 300000);
          const response = await surveyAPI.getAllSurveys();
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          // Use a more specific type if possible
          surveyData = (response as { data?: Survey[] }).data || [];
          if (isMountedRef.current) {
            setSurveys(surveyData);
          }
        } catch (apiError: unknown) {
          console.error('❌ FRONTEND: API call failed:', apiError);
          console.error('❌ FRONTEND: Error details:', {
            message: apiError instanceof Error ? apiError.message : 'Unknown error',
            stack: apiError instanceof Error ? apiError.stack : undefined
          });
          throw apiError;
        }
        if (surveyData.length > 0) {
          // Find all surveys with CRM ID 1187
          const crmId1187Surveys = surveyData.filter(s => s.crmId == '1187');
        }
      } catch (err: unknown) {
        console.error('Error fetching surveys:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setLoadingTracker(null);
        }
      }
    };
    fetchSurveys();
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (controller) {
        controller.abort();
      }
    };
  }, [setLoadingTracker]);

  const enrichedSurveys = useMemo(() => {
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
    
    return processed;
  }, [surveys]);

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
    
    if (valid.length === 0) {

      processedSurveys.slice(0, 3).forEach((s: EnrichedSurvey, i: number) => {

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

  useEffect(() => {
    // Only run if component is mounted
    if (!isMountedRef.current) {
      return;
    }
    
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
      }
    }
    if (isMountedRef.current) {
      setTop5Surveys(unique);
    }
  }, [validSurveys]);

  useEffect(() => {
    // Only run if component is mounted
    if (!isMountedRef.current) {
      return;
    }
    
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
      }
    }
    if (isMountedRef.current) {
      setLowest5Surveys(unique);
    }
  }, [validSurveys]);

  const filteredSurveys = useMemo(() => {
    console.log('='.repeat(80));
    console.log('📊 SURVEY RANKINGS UPDATE:', new Date().toLocaleTimeString());
    console.log('='.repeat(80));
    
    // Console logging for top 5 surveys

    let totalUXScore = 0;
    let bayesianCount = 0;
    top5Surveys.forEach((survey, index) => {
      totalUXScore += survey.uxScore;
      if (survey.xscore !== null && survey.xscore !== undefined) bayesianCount++;
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Bayesian XScore: ${survey.xscore?.toFixed(2) || 'N/A'} | Legacy Score: ${survey.experienceScore?.toFixed(2) || 'N/A'} | Using: ${survey.xscore !== null && survey.xscore !== undefined ? 'Bayesian' : 'Legacy'}`);
      
      // SPECIFIC DEBUGGING FOR CRM ID 1187
      if (survey.crmId === '1187' || survey.crmId === 1187) {
        console.log(`   🚨 CRM ID 1187 FOUND IN TOP 5 (Position ${index + 1}):`);

        console.log(`      - Frontend UX Score: ${survey.uxScore.toFixed(2)}`);
        console.log(`      - Backend XScore: ${survey.xscore?.toFixed(2) || 'N/A'}`);
        console.log(`      - User Rating (Frontend): ${survey.userRating}`);
        console.log(`      - User Sentiment (Frontend): ${survey.userSentiment}`);
        console.log(`      - Dropoff % (Frontend): ${survey.dropOffPercent}`);
        console.log(`      - Screenout % (Frontend): ${survey.screenOutPercent}`);
        if (survey.breakdown) {

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

    lowest5Surveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Bayesian XScore: ${survey.xscore?.toFixed(2) || 'N/A'} | Legacy Score: ${survey.experienceScore?.toFixed(2) || 'N/A'}`);
      // Log contributions breakdown for each lowest survey
      const totalContributions = survey.contributions.userRating + survey.contributions.sentiment + survey.contributions.dropoff + survey.contributions.screenout + survey.contributions.questionCount;
      console.log(`   📊 CONTRIBUTIONS: User Rating: ${survey.contributions.userRating.toFixed(2)} | Sentiment: ${survey.contributions.sentiment.toFixed(2)} | Dropoff: ${survey.contributions.dropoff.toFixed(2)} | Screenout: ${survey.contributions.screenout.toFixed(2)} | Questions: ${survey.contributions.questionCount.toFixed(2)} | Total: ${totalContributions.toFixed(2)} | UX Score: ${survey.uxScore.toFixed(2)} | Match: ${Math.abs(totalContributions - survey.uxScore) < 0.1 ? '✅' : '❌'}`);
    });
    
    // Log current filter selection
    console.log(`🎯 CURRENT FILTER: ${filter.toUpperCase()}`);
    
    // Additional debugging for the problematic survey
    const problematicSurvey = enrichedSurveys.find(s => s.crmId === '914' || s.uxScore === 25.6);
    if (problematicSurvey) {

      console.log(`  Is in top5: ${top5Surveys.some(s => s.crmId === problematicSurvey.crmId)}`);
      console.log(`  Is in lowest5: ${lowest5Surveys.some(s => s.crmId === problematicSurvey.crmId)}`);
    }
    
    console.log('='.repeat(80));
    
    // Return based on current filter
    let result;
    if (filter === "top5") {
      result = top5Surveys.slice(0, 5); // Ensure exactly 5 surveys

    } else if (filter === "lowest5") {
      result = lowest5Surveys.slice(0, 5); // Ensure exactly 5 surveys

    } else {
      result = top5Surveys.slice(0, 5); // Default to top 5

    }
    
    return result;
  }, [filter, top5Surveys, lowest5Surveys, enrichedSurveys]);

  // --- CONDITIONAL RENDERING VARIABLES ---
  let renderContent: React.ReactNode = null;
  if (authLoading && process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true') {
    renderContent = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  } else if (!isAuthenticated && process.env.NEXT_PUBLIC_DISABLE_AUTH !== 'true') {
    renderContent = (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  } else if (isLoading) {
    renderContent = (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" role="status" />
      </div>
    );
  } else if (error) {
    renderContent = (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  } else {
    renderContent = (
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
            <div 
              key={`survey-list-${filter}`}
              className="flex flex-col gap-[15px] w-full max-w-6xl mx-auto"
            >
              {filteredSurveys.map((survey, idx) => (
                <SurveyCard
                  key={`${filter}-${survey.crmId}-${idx}`}
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
  return renderContent;
}
