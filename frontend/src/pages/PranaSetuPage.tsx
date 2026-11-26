import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for PranaSetu Emergency QR Access.
 * Route: /pranaSetu, /pranasetu, /prana-setu
 */
export default function PranaSetuPage() {
  return <DashboardPage defaultView="grid" defaultTab="all" defaultEmergencyOpen={true} />;
}
