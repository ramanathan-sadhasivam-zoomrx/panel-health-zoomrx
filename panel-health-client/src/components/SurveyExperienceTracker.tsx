'use client';

import React, { useState, useEffect } from 'react';
import { SurveyCard } from './ui/SurveyCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { EnrichedSurvey } from '@/lib/surveyScoreUtils';
import { surveyAPI } from '@/lib/api';
import { dummySurveys } from '@/data/dummySurveys';

interface SurveyExperienceTrackerProps {
  surveys?: EnrichedSurvey[];
}

export default function SurveyExperienceTracker({ surveys: propSurveys }: SurveyExperienceTrackerProps) {
  const [surveys, setSurveys] = useState<EnrichedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSurveyId, setExpandedSurveyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true);
        const data = await surveyAPI.getAllSurveys();
        setSurveys(data.surveys || data || []);
      } catch (err) {
        console.error('Error fetching surveys:', err);
        console.log('Falling back to dummy data for development...');
        // Fallback to dummy data for development
        setSurveys(dummySurveys as EnrichedSurvey[]);
        setError(null); // Clear error since we have fallback data
      } finally {
        setLoading(false);
      }
    };

    if (!propSurveys) {
      fetchSurveys();
    } else {
      setSurveys(propSurveys);
      setLoading(false);
    }
  }, [propSurveys]);

  const top5Surveys = surveys
    .sort((a, b) => b.uxScore - a.uxScore)
    .slice(0, 5);

  const bottom5Surveys = surveys
    .sort((a, b) => a.uxScore - b.uxScore)
    .slice(0, 5);

  const handleExpand = (surveyId: string) => {
    setExpandedSurveyId(expandedSurveyId === surveyId ? null : surveyId);
  };

  const getTrendIcon = (score: number) => {
    if (score > 7) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (score < 5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 6) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>Loading surveys...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Surveys</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Survey Experience Tracker</h1>
          <p className="text-muted-foreground">
            Monitor and analyze survey performance with UX scoring
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Total Surveys:</span>
          <Badge variant="outline">{surveys.length}</Badge>
        </div>
      </div>

      <Tabs defaultValue="top5" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="top5" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Top 5 Surveys</span>
          </TabsTrigger>
          <TabsTrigger value="bottom5" className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4" />
            <span>Lowest 5 Surveys</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="top5" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Top 5 Performing Surveys</span>
              </CardTitle>
              <CardDescription>
                Surveys with the highest UX scores and user satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {top5Surveys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No surveys available
                </p>
              ) : (
                <div className="space-y-4">
                  {top5Surveys.map((survey, index) => (
                    <div key={survey.crmId} className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <SurveyCard
                        survey={survey}
                        expanded={expandedSurveyId === survey.crmId}
                        onExpand={() => handleExpand(survey.crmId)}
                        cardWidth="100%"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottom5" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span>Surveys Needing Improvement</span>
              </CardTitle>
              <CardDescription>
                Surveys with lower UX scores that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bottom5Surveys.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No surveys available
                </p>
              ) : (
                <div className="space-y-4">
                  {bottom5Surveys.map((survey, index) => (
                    <div key={survey.crmId} className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-800 rounded-full font-bold">
                        {surveys.length - bottom5Surveys.length + index + 1}
                      </div>
                      <SurveyCard
                        survey={survey}
                        expanded={expandedSurveyId === survey.crmId}
                        onExpand={() => handleExpand(survey.crmId)}
                        cardWidth="100%"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {surveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Survey Performance Summary</CardTitle>
            <CardDescription>
              Overview of survey performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {surveys.filter(s => s.uxScore >= 8).length}
                </p>
                <p className="text-sm text-muted-foreground">Excellent Surveys</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {surveys.filter(s => s.uxScore >= 6 && s.uxScore < 8).length}
                </p>
                <p className="text-sm text-muted-foreground">Good Surveys</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {surveys.filter(s => s.uxScore < 6).length}
                </p>
                <p className="text-sm text-muted-foreground">Needs Improvement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 