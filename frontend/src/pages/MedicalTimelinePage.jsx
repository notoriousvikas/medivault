import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for Chronological Medical Timeline.
 * Route: /medicalTimeline, /medical-timeline, /timeline
 */
export default function MedicalTimelinePage() {
  return <DashboardPage defaultView="timeline" defaultTab="all" />;
}
