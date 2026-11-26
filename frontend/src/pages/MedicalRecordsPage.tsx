import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for Medical Records Vault.
 * Route: /medicalRecords, /records, /medical-records
 */
export default function MedicalRecordsPage() {
  return <DashboardPage defaultView="grid" defaultTab="all" />;
}
