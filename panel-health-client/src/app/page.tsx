"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { SurveyCard } from '@/components/ui/SurveyCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { surveyAPI } from '@/lib/api';
import { calculateUXScore } from '@/lib/surveyScoreUtils';
import { Loader2, Info } from 'lucide-react';
import type { Survey } from '@/data/dummySurveys';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLoading } from '@/contexts/LoadingContext';

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
  const [filter, setFilter] = useState("top5");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  
  // Separate state for top 5 and lowest 5 to ensure complete isolation
  const [top5Surveys, setTop5Surveys] = useState<EnrichedSurvey[]>([]);
  const [lowest5Surveys, setLowest5Surveys] = useState<EnrichedSurvey[]>([]);
  
  // Handle filter change with state reset
  const handleFilterChange = (newFilter: string) => {
    console.log(`🔄 FILTER CHANGING: ${filter} → ${newFilter}`);
    setFilter(newFilter);
    // Reset expanded state when filter changes to prevent stale data
    setExpanded(null);
  };

  // Global loading context
  const { setLoadingTracker } = useLoading();

  useEffect(() => setMounted(true), []);

  // Fetch surveys from API
  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadingTracker("survey"); // Set global loading state
        
        const response = await surveyAPI.getAllSurveys();
        const surveyData = (response as any).data || [];
        setSurveys(surveyData);
        
        // Console logging for data fetch
        console.log('📊 SURVEY DATA FETCHED:', {
          totalSurveys: surveyData.length,
          timestamp: new Date().toISOString()
        });
        
      } catch (err: any) {
        console.error('Error fetching surveys:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
        setLoadingTracker(null); // Clear global loading state
      }
    };

    fetchSurveys();
  }, [setLoadingTracker]);

  const enrichedSurveys = useMemo(() => {
    return surveys.map(survey => {
      // Use the experience score calculated by the backend
      const uxScore = survey.experienceScore || 0;
      
      // Calculate individual contributions for display (matching backend logic exactly)
      const normalizedUserRating = (Math.max(1, survey.userRating) - 1) / 9;
      const userRating = normalizedUserRating * 35;
      const normalizedUserSentiment = (survey.userSentiment + 1) / 2;
      const sentiment = normalizedUserSentiment * 25;
      const dropoff = (100 - survey.dropOffPercent) / 100 * 20;
      const screenout = (100 - survey.screenOutPercent) / 100 * 15;
      
      // Fix screener questions calculation to match backend exactly
      let questionCount;
      if (survey.questionsInScreener <= 12) {
        questionCount = ((12 - survey.questionsInScreener) / 9) * 5;
      } else {
        const excessQuestions = survey.questionsInScreener - 12;
        const maxExcessForMinScore = 18; // 30 - 12 = 18 questions to reach -5%
        const negativeContribution = Math.min(5, (excessQuestions / maxExcessForMinScore) * 5);
        questionCount = -negativeContribution;
      }
      
      return {
        ...survey,
        uxScore, // Use backend-calculated score consistently
        contributions: {
          userRating,
          sentiment,
          dropoff,
          screenout,
          questionCount,
        }
      };
    });
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
    
    // Log surveys that were filtered out
    const invalidSurveys = processedSurveys.filter(survey => 
      typeof survey.uxScore !== 'number' || 
      isNaN(survey.uxScore)
    );
    
    if (invalidSurveys.length > 0) {
      console.log('🚫 INVALID SURVEYS FILTERED OUT:', invalidSurveys.map(s => ({
        id: s.id,
        crmId: s.crmId,
        title: s.surveyTitle,
        uxScore: s.uxScore
      })));
    }
    
    return valid;
  }, [enrichedSurveys]);

  // Calculate and set top 5 surveys when validSurveys changes
  useEffect(() => {
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
    setTop5Surveys(unique);
  }, [validSurveys]);

  // Calculate and set lowest 5 surveys when validSurveys changes
  useEffect(() => {
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
    setLowest5Surveys(unique);
  }, [validSurveys]);

  // Select the appropriate list based on filter
  const filteredSurveys = useMemo(() => {
    console.log('='.repeat(80));
    console.log('📊 SURVEY RANKINGS UPDATE:', new Date().toLocaleTimeString());
    console.log('='.repeat(80));
    
    // Console logging for top 5 surveys
    console.log('🏆 TOP 5 SURVEYS:');
    top5Surveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Backend Score: ${survey.experienceScore?.toFixed(2) || 'N/A'}`);
    });
    
    // Console logging for lowest 5 surveys
    console.log('📉 LOWEST 5 SURVEYS:');
    lowest5Surveys.forEach((survey, index) => {
      console.log(`${index + 1}. Survey ID: ${survey.id} | CRM ID: ${survey.crmId} | Title: ${survey.surveyTitle} | UX Score: ${survey.uxScore.toFixed(2)} | Backend Score: ${survey.experienceScore?.toFixed(2) || 'N/A'}`);
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
              {mounted ? (
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
