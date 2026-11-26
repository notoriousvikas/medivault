import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for AI Prescriptions & Drug Safety Checks.
 * Route: /aiPrescriptions, /prescriptions, /ai-prescriptions
 */
export default function PrescriptionsPage() {
  return <DashboardPage defaultView="prescriptions" defaultTab="all" />;
}
