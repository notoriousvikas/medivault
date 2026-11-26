import React from 'react';
import DashboardPage from './DashboardPage';

/**
 * Dedicated page for Imaging Scans & X-Rays.
 * Route: /imagingScans, /imaging, /scans, /imaging-scans
 */
export default function ImagingScansPage() {
  return <DashboardPage defaultView="grid" defaultTab="Scan" />;
}
