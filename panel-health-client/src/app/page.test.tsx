import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from './page';
import { dummySurveys } from '@/data/dummySurveys';

jest.mock('@/data/dummySurveys', () => ({
  dummySurveys: [
    {
      surveyTitle: "Test Survey 1",
      crmId: "TEST1",
      userRating: 8.5,
      userSentiment: 0.7,
      dropOffPercent: 15,
      screenOutPercent: 10,
      questionsInScreener: 8,
      qualitativeComments: ["Great survey!"],
      adminPortalLink: "#"
    },
    {
      surveyTitle: "Test Survey 2",
      crmId: "TEST2",
      userRating: 7.5,
      userSentiment: 0.5,
      dropOffPercent: 20,
      screenOutPercent: 15,
      questionsInScreener: 10,
      qualitativeComments: ["Good survey"],
      adminPortalLink: "#"
    }
  ]
}));

describe('DashboardPage', () => {
  it('renders the dashboard title and description', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Panel Health Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Survey UX Rating Prototype')).toBeInTheDocument();
  });

  it('renders the filter select with correct options', () => {
    render(<DashboardPage />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    fireEvent.click(select);
    expect(screen.getAllByText('All Surveys')[0]).toBeInTheDocument();
    expect(screen.getByText('Top 5')).toBeInTheDocument();
    expect(screen.getByText('Lowest 5')).toBeInTheDocument();
  });

  it('shows all surveys by default', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Test Survey 1')).toBeInTheDocument();
    expect(screen.getByText('Test Survey 2')).toBeInTheDocument();
  });

  it('filters to show only top 5 surveys', () => {
    render(<DashboardPage />);
    const select = screen.getByRole('combobox');
    fireEvent.click(select);
    fireEvent.click(screen.getByText('Top 5'));
    expect(screen.getByText('Test Survey 1')).toBeInTheDocument();
    expect(screen.getByText('Test Survey 2')).toBeInTheDocument();
  });

  it('shows the score calculation explanation dialog', () => {
    render(<DashboardPage />);
    const helpButton = screen.getByRole('button', { name: 'Help' });
    fireEvent.click(helpButton);
    expect(screen.getByText('How is the UX Score Calculated?')).toBeInTheDocument();
    expect(screen.getByText('User Rating (35 points)')).toBeInTheDocument();
    expect(screen.getByText('User Sentiment (25 points)')).toBeInTheDocument();
    expect(screen.getByText('Drop-off Rate (20 points)')).toBeInTheDocument();
    expect(screen.getByText('Screen-out Rate (15 points)')).toBeInTheDocument();
    expect(screen.getByText('Screener Questions (5 points)')).toBeInTheDocument();
  });

  // For loading and error state, you may need to mock the fetch or state logic if it's not easily triggerable
}); 