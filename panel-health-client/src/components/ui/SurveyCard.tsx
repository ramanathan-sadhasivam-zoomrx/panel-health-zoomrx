"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { EnrichedSurvey } from "@/lib/surveyScoreUtils";

interface SurveyCardProps {
  survey: EnrichedSurvey;
  expanded: boolean;
  onExpand: () => void;
  cardWidth?: string;
  style?: React.CSSProperties;
}

export function SurveyCard({ survey, expanded, onExpand, cardWidth, style }: SurveyCardProps) {
  const {
    surveyTitle,
    crmId,
    uxScore,
    userRating = 0,
    userSentiment = 0,
    dropOffPercent = 0,
    screenOutPercent = 0,
    questionsInScreener = 0,
    qualitativeComments = [],
    adminPortalLink,
    contributions = {
      userRating: 0,
      sentiment: 0,
      dropoff: 0,
      screenout: 0,
      questionCount: 0
    },
    bayesianMetrics,
  } = survey;

  // Ensure qualitativeComments is always an array
  const safeQualitativeComments = Array.isArray(qualitativeComments) ? qualitativeComments : [];

  // Use backend values for display - no frontend calculations
  const displayUserRating = survey.breakdown?.userRating?.value || userRating;
  const displayUserSentiment = survey.breakdown?.userSentiment?.value || userSentiment;
  const displayDropoffRate = survey.breakdown?.dropoffRate?.value || dropOffPercent;
  const displayScreenoutRate = survey.breakdown?.screenoutRate?.value || screenOutPercent;

  return (
    <div className="w-full" style={{ maxWidth: cardWidth || '48rem', ...style }}>
      <Card
        className={`cursor-pointer transition-all duration-300 hover:shadow-lg w-full ${expanded ? "shadow-lg border-blue-400" : ""}`}
        onClick={onExpand}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${surveyTitle} - UX Score: ${typeof uxScore === 'number' ? uxScore.toFixed(1) : '0.0'}`}
      >
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <CardTitle className="mb-0.5">{surveyTitle}</CardTitle>
                {expanded && (
                  <a
                    href={adminPortalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                    title="View in Admin Portal"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="h-5 w-5 align-middle" />
                  </a>
                )}
              </div>
              <CardDescription>CRM: {survey.crmName || crmId}</CardDescription>
            </div>
            <div className="flex flex-col justify-center items-end">
              <p className="text-2xl font-bold">{typeof uxScore === 'number' ? uxScore.toFixed(1) : '0.0'}</p>
              <p className="text-xs text-muted-foreground">
                UX Score
              </p>
            </div>
          </div>
        </CardHeader>
        {/* No metric indicators in minimized view */}
        {expanded && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">UX Score Breakdown</h3>
                </div>
                {/* 5-column grid for metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                    <p className="text-xs font-medium whitespace-nowrap">User Rating</p>
                    <p className="text-xs text-muted-foreground">{typeof displayUserRating === 'number' ? displayUserRating.toFixed(1) : '0.0'}/10</p>
                    <p className="text-base font-bold">+{typeof contributions.userRating === 'number' ? contributions.userRating.toFixed(1) : '0.0'}</p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                    <p className="text-xs font-medium whitespace-nowrap">User Sentiment Score</p>
                    <p className="text-xs text-muted-foreground">{typeof displayUserSentiment === 'number' ? displayUserSentiment.toFixed(2) : '0.00'}</p>
                    <p className="text-base font-bold">+{typeof contributions.sentiment === 'number' ? contributions.sentiment.toFixed(1) : '0.0'}</p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                    <p className="text-xs font-medium whitespace-nowrap">Drop-off Rate</p>
                    <p className="text-xs text-muted-foreground">{typeof displayDropoffRate === 'number' ? displayDropoffRate.toFixed(1) : '0.0'}%</p>
                    <p className="text-base font-bold">+{typeof contributions.dropoff === 'number' ? contributions.dropoff.toFixed(1) : '0.0'}</p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                    <p className="text-xs font-medium whitespace-nowrap">Screen-out Rate</p>
                    <p className="text-xs text-muted-foreground">{typeof displayScreenoutRate === 'number' ? displayScreenoutRate.toFixed(1) : '0.0'}%</p>
                    <p className="text-base font-bold">+{typeof contributions.screenout === 'number' ? contributions.screenout.toFixed(1) : '0.0'}</p>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted rounded-lg">
                    <p className="text-xs font-medium whitespace-nowrap">Screener Questions</p>
                    <p className={`text-xs text-muted-foreground ${typeof contributions.questionCount === 'number' && contributions.questionCount < 0 ? 'text-destructive' : ''}`}>{questionsInScreener}</p>
                    <p className="text-base font-bold">{typeof contributions.questionCount === 'number' ? (contributions.questionCount >= 0 ? '+' : '') + contributions.questionCount.toFixed(1) : '0.0'}</p>
                  </div>
                </div>
              </div>
              {safeQualitativeComments && safeQualitativeComments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Qualitative Comments</h3>
                  <div className="space-y-1">
                    {safeQualitativeComments.map((comment, index) => (
                      <QualitativeComment
                        key={index}
                        comment={comment}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function QualitativeComment({ comment }: { comment: string }) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(comment);
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(comment);
      setHasCopied(true);
      setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    }
  };

  return (
    <div
      className="group flex cursor-default items-center justify-between px-2 py-1 bg-muted rounded-md"
      role="group"
      aria-label="Qualitative comment"
    >
      <p className="text-xs italic pr-2">"{comment}"</p>
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        onKeyDown={handleKeyDown}
        aria-label="Copy comment"
        tabIndex={0}
      >
        {hasCopied ? (
          <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
} 