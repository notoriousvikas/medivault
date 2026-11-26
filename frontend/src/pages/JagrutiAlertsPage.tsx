import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for Jagruti Community Health & Risk Alerts.
 * Route: /jagrutiAlerts, /jagruti, /alerts, /jagruti-alerts
 */
export default function JagrutiAlertsPage() {
  return <DashboardPage defaultView="area-alerts" defaultTab="all" />;
}
