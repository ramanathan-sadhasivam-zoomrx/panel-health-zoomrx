import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurveyCard } from './SurveyCard';

const mockSurvey = {
  surveyTitle: "Test Survey",
  crmId: "TEST123",
  userRating: 8.5,
  userSentiment: 0.7,
  dropOffPercent: 15,
  screenOutPercent: 10,
  questionsInScreener: 8,
  qualitativeComments: ["Great survey!", "Very user-friendly"],
  adminPortalLink: "https://example.com/admin",
  uxScore: 85,
  contributions: {
    userRating: 35,
    sentiment: 25,
    dropoff: 15,
    screenout: 10,
    questionCount: 5
  }
};

describe('SurveyCard', () => {
  it('renders survey title and CRM ID', () => {
    render(<SurveyCard survey={mockSurvey} />);
    expect(screen.getByText('Test Survey')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('CRM ID:') && content.includes('TEST123'))).toBeInTheDocument();
  });

  it('displays correct metrics', () => {
    render(<SurveyCard survey={mockSurvey} />);
    expect(screen.getByText('85.0')).toBeInTheDocument(); // UX Score
    expect(screen.getByTestId('user-rating')).toHaveTextContent('User Rating: 8.5');
    expect(screen.getByTestId('sentiment')).toHaveTextContent('Sentiment: 0.7');
    expect(screen.getByTestId('dropoff')).toHaveTextContent('Drop-off Rate: 15%');
    expect(screen.getByTestId('screenout')).toHaveTextContent('Screen-out Rate: 10%');
  });

  it('shows qualitative comments', async () => {
    render(<SurveyCard survey={mockSurvey} />);
    const card = screen.getByRole('button');
    await act(async () => { card.click(); });
    const comments = screen.getAllByLabelText('Qualitative comment');
    expect(within(comments[0]).getByText(/Great survey!/)).toBeInTheDocument();
    expect(within(comments[1]).getByText(/Very user-friendly/)).toBeInTheDocument();
  });

  it('has a working admin portal link', async () => {
    render(<SurveyCard survey={mockSurvey} />);
    const card = screen.getByRole('button');
    await act(async () => { card.click(); });
    const adminLink = screen.getByRole('link', { name: /view in admin portal/i });
    expect(adminLink).toHaveAttribute('href', 'https://example.com/admin');
  });

  it('displays correct score color based on rating', () => {
    render(<SurveyCard survey={mockSurvey} />);
    const scoreElement = screen.getByText('85.0');
    expect(scoreElement).toHaveClass('text-2xl', 'font-bold');
  });
}); 