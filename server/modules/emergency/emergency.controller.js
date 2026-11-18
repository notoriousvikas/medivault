import crypto from 'node:crypto';
import { User } from '../users/user.model.js';
import { Prescription } from '../prescriptions/prescription.model.js';
import { generateQRCodeDataURL, generateQRCodeSVG } from '../../utils/qrcode.js';
import { AppError, catchAsync } from '../../middleware/error.middleware.js';

/**
 * Builds the public emergency URL for a given emergency token.
 */
function getEmergencyUrl(req, token) {
  const baseUrl =
    process.env.CLIENT_URL ||
    `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/emergency/${token}`;
}

/**
 * Generate responsive, high-visibility Emergency Medical Card HTML for first responders/ER.
 */
function renderEmergencyCardHTML({
  patient,
  emergencyContacts,
  criticalConditions,
  notes,
  organDonor,
  primaryPhysician,
  insuranceInfo,
  activeMedications,
}) {
  const contactsHTML =
    emergencyContacts && emergencyContacts.length > 0
      ? emergencyContacts
          .map(
            (c) => `
      <div class="contact-card">
        <div class="contact-info">
          <strong>${c.name}</strong> <span class="badge relationship">${c.relationship || 'Emergency Contact'}</span>
          <div class="contact-phone">${c.phone || 'N/A'}</div>
        </div>
        ${
          c.phone
            ? `<a href="tel:${c.phone}" class="call-btn">📞 Call Now</a>`
            : ''
        }
      </div>`
          )
          .join('')
      : '<p class="empty-state">No emergency contacts registered.</p>';

  const allergiesHTML =
    patient.allergies && patient.allergies.length > 0
      ? patient.allergies
          .map((a) => `<span class="badge allergy-badge">⚠️ ${a}</span>`)
          .join(' ')
      : '<span class="badge safe-badge">No known allergies reported</span>';

  const conditionsHTML =
    criticalConditions && criticalConditions.length > 0
      ? criticalConditions
          .map((c) => `<span class="badge condition-badge">⚡ ${c}</span>`)
          .join(' ')
      : '<span class="text-muted">None specified</span>';

  const medicationsHTML =
    activeMedications && activeMedications.length > 0
      ? `
      <table class="meds-table">
        <thead>
          <tr>
            <th>Medication</th>
            <th>Dosage</th>
            <th>Frequency</th>
          </tr>
        </thead>
        <tbody>
          ${activeMedications
            .map(
              (m) => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.dosage}</td>
              <td>${m.frequency}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : '<p class="empty-state">No active medications registered.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EMERGENCY MEDICAL ID - ${patient.name}</title>
  <style>
    :root {
      --primary-red: #dc2626;
      --dark-red: #991b1b;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); line-height: 1.5; padding: 16px; }
    .container { max-width: 600px; margin: 0 auto; background: var(--card-bg); border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; border: 2px solid var(--primary-red); }
    .header { background: var(--primary-red); color: white; padding: 20px; text-align: center; }
    .header h1 { font-size: 1.3rem; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; font-weight: 800; }
    .header p { font-size: 0.85rem; opacity: 0.9; }
    .patient-hero { padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
    .patient-name { font-size: 1.6rem; font-weight: 700; color: var(--text-main); }
    .blood-group-box { background: #fee2e2; border: 2px solid var(--primary-red); color: var(--primary-red); padding: 8px 16px; border-radius: 12px; font-size: 1.4rem; font-weight: 900; text-align: center; }
    .blood-label { font-size: 0.65rem; text-transform: uppercase; display: block; font-weight: 700; color: var(--dark-red); }
    .section { padding: 18px 20px; border-bottom: 1px solid var(--border); }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin: 2px 4px 2px 0; }
    .allergy-badge { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; font-weight: 700; font-size: 0.95rem; }
    .condition-badge { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .safe-badge { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .relationship { background: #f1f5f9; color: #475569; font-size: 0.75rem; margin-left: 6px; }
    .alert-box { background: #fff1f2; border-left: 4px solid var(--primary-red); padding: 12px 16px; border-radius: 4px; font-size: 0.95rem; color: #881337; margin-top: 6px; font-weight: 500; }
    .contact-card { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; }
    .contact-phone { font-size: 1.05rem; color: #0284c7; font-weight: 700; margin-top: 2px; }
    .call-btn { background: #16a34a; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 6px; }
    .call-btn:hover { background: #15803d; }
    .meds-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 6px; }
    .meds-table th, .meds-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); }
    .meds-table th { background: #f8fafc; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; }
    .footer { text-align: center; padding: 16px; font-size: 0.75rem; color: var(--text-muted); background: #f1f5f9; }
    .empty-state { color: var(--text-muted); font-style: italic; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Medical Emergency ID</h1>
      <p>Critical First Responder & Clinical Data</p>
    </div>

    <div class="patient-hero">
      <div>
        <div class="patient-name">${patient.name}</div>
        <div style="color: var(--text-muted); font-size: 0.9rem;">
          Age: ${patient.age || 'N/A'} • Organ Donor: <strong>${
    organDonor ? 'YES (Donor)' : 'No'
  }</strong>
        </div>
      </div>
      <div class="blood-group-box">
        <span class="blood-label">Blood Group</span>
        ${patient.bloodGroup || 'UNKNOWN'}
      </div>
    </div>

    <!-- Critical Allergies -->
    <div class="section" style="background: #fff5f5;">
      <div class="section-title" style="color: var(--dark-red);">⚠️ Life-Threatening Allergies</div>
      <div>${allergiesHTML}</div>
    </div>

    <!-- Critical Conditions & Medical Alerts -->
    <div class="section">
      <div class="section-title">⚡ Chronic Conditions & Medical Alerts</div>
      <div>${conditionsHTML}</div>
      ${
        notes
          ? `<div class="alert-box"><strong>Special Instructions:</strong> ${notes}</div>`
          : ''
      }
    </div>

    <!-- Emergency Contacts -->
    <div class="section">
      <div class="section-title">📞 Emergency Contacts (Tap to Call)</div>
      ${contactsHTML}
    </div>

    <!-- Active Medications -->
    <div class="section">
      <div class="section-title">💊 Active Medications</div>
      ${medicationsHTML}
    </div>

    <!-- Primary Physician & Insurance -->
    <div class="section">
      <div class="section-title">🏥 Healthcare Provider & Insurance</div>
      <div style="font-size: 0.9rem; color: #334155;">
        ${
          primaryPhysician?.name
            ? `<div><strong>Doctor:</strong> Dr. ${primaryPhysician.name} ${
                primaryPhysician.phone ? `(${primaryPhysician.phone})` : ''
              } - ${primaryPhysician.hospital || ''}</div>`
            : ''
        }
        ${
          insuranceInfo?.provider
            ? `<div style="margin-top: 4px;"><strong>Insurance:</strong> ${insuranceInfo.provider} (Policy: ${insuranceInfo.policyNumber || 'N/A'})</div>`
            : ''
        }
        ${
          !primaryPhysician?.name && !insuranceInfo?.provider
            ? '<span class="empty-state">No primary physician or insurance details listed.</span>'
            : ''
        }
      </div>
    </div>

    <div class="footer">
      Powered by MediVault Emergency Response System • For authorized emergency medical use only
    </div>
  </div>
</body>
</html>`;
}

/**
 * Public Emergency Access Endpoint.
 * Scanned from QR code or accessed via public URL in emergency conditions.
 * No login required. Returns vital life-saving info.
 */
const getEmergencyProfileByToken = catchAsync(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new AppError('Emergency token is required.', 400);
  }

  const user = await User.findOne({ emergencyToken: token });

  if (!user || user.emergencyInfo?.isEnabled === false) {
    if (
      req.headers.accept?.includes('text/html') ||
      req.query.format === 'html'
    ) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Emergency Profile Not Found</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #f8fafc;">
          <h1 style="color: #dc2626;">🚨 Emergency Profile Not Found</h1>
          <p style="color: #64748b; margin-top: 10px;">This emergency medical card is invalid or has been deactivated by the user.</p>
        </body>
        </html>
      `);
    }
    throw new AppError(
      'Emergency profile not found or emergency access is disabled.',
      404
    );
  }

  // Pull active medications from user's prescriptions
  const prescriptions = await Prescription.find({ userId: user._id })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  const activeMedications = [];
  const seenMeds = new Set();
  for (const p of prescriptions) {
    for (const m of p.medications || []) {
      const key = m.name?.toLowerCase().trim();
      if (key && !seenMeds.has(key)) {
        seenMeds.add(key);
        activeMedications.push({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        });
      }
    }
  }

  // Record access log asynchronously (audit trail for patient)
  const clientIp =
    req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
  const userAgent = req.get('user-agent');

  User.updateOne(
    { _id: user._id },
    {
      $push: {
        emergencyAccessLogs: {
          $each: [{ accessedAt: new Date(), ipAddress: clientIp, userAgent }],
          $slice: -50, // Keep last 50 access logs
        },
      },
    }
  ).exec().catch(() => {});

  const emergencyData = {
    patient: {
      name: user.name,
      age: user.age,
      bloodGroup: user.bloodGroup || 'UNKNOWN',
      allergies: user.allergies || [],
    },
    emergencyContacts: user.emergencyContacts || [],
    criticalConditions: user.emergencyInfo?.criticalConditions || [],
    notes: user.emergencyInfo?.notes || '',
    organDonor: Boolean(user.emergencyInfo?.organDonor),
    primaryPhysician: user.emergencyInfo?.primaryPhysician || {},
    insuranceInfo: user.emergencyInfo?.insuranceInfo || {},
    activeMedications,
  };

  // Return HTML for mobile phone browsers scanning QR code
  if (
    req.headers.accept?.includes('text/html') ||
    req.query.format === 'html'
  ) {
    return res.status(200).send(renderEmergencyCardHTML(emergencyData));
  }

  // Return JSON for app or API consumers
  res.status(200).json({
    status: 'success',
    data: emergencyData,
  });
});

/**
 * Authenticated Endpoint: Get current user's emergency profile and QR code
 */
const getMyEmergencyProfile = catchAsync(async (req, res) => {
  let user = await User.findById(req.user.userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Ensure user has an emergencyToken
  if (!user.emergencyToken) {
    user.emergencyToken = crypto.randomBytes(16).toString('hex');
    await user.save();
  }

  const emergencyUrl = getEmergencyUrl(req, user.emergencyToken);
  const qrCodeDataUrl = await generateQRCodeDataURL(emergencyUrl);

  // Pull active medications
  const prescriptions = await Prescription.find({ userId: user._id })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  const activeMedications = [];
  const seenMeds = new Set();
  for (const p of prescriptions) {
    for (const m of p.medications || []) {
      const key = m.name?.toLowerCase().trim();
      if (key && !seenMeds.has(key)) {
        seenMeds.add(key);
        activeMedications.push({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        });
      }
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      emergencyToken: user.emergencyToken,
      emergencyUrl,
      qrCodeDataUrl,
      patient: {
        name: user.name,
        age: user.age,
        bloodGroup: user.bloodGroup,
        allergies: user.allergies,
      },
      emergencyContacts: user.emergencyContacts,
      emergencyInfo: user.emergencyInfo,
      activeMedications,
      totalAccessLogs: user.emergencyAccessLogs?.length || 0,
    },
  });
});

/**
 * Authenticated Endpoint: Download or view raw QR code (image, svg, or JSON)
 */
const getEmergencyQRCode = catchAsync(async (req, res) => {
  let user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User not found.', 404);

  if (!user.emergencyToken) {
    user.emergencyToken = crypto.randomBytes(16).toString('hex');
    await user.save();
  }

  const emergencyUrl = getEmergencyUrl(req, user.emergencyToken);
  const { format = 'json' } = req.query;

  if (format === 'svg') {
    const svg = await generateQRCodeSVG(emergencyUrl);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.status(200).send(svg);
  }

  const qrCodeDataUrl = await generateQRCodeDataURL(emergencyUrl);

  if (format === 'image' || format === 'png') {
    const base64Data = qrCodeDataUrl.split(',')[1];
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const isSvg = qrCodeDataUrl.startsWith('data:image/svg+xml');
    res.setHeader(
      'Content-Type',
      isSvg ? 'image/svg+xml' : 'image/png'
    );
    return res.status(200).send(imgBuffer);
  }

  res.status(200).json({
    status: 'success',
    data: {
      emergencyUrl,
      qrCodeDataUrl,
      emergencyToken: user.emergencyToken,
    },
  });
});

/**
 * Authenticated Endpoint: Update emergency information & contacts
 */
const updateEmergencyInfo = catchAsync(async (req, res) => {
  const {
    criticalConditions,
    notes,
    organDonor,
    primaryPhysician,
    insuranceInfo,
    isEnabled,
    bloodGroup,
    allergies,
    emergencyContacts,
  } = req.body;

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User not found.', 404);

  if (!user.emergencyInfo) {
    user.emergencyInfo = {};
  }

  if (criticalConditions !== undefined) {
    user.emergencyInfo.criticalConditions = Array.isArray(criticalConditions)
      ? criticalConditions
      : [criticalConditions];
  }

  if (notes !== undefined) user.emergencyInfo.notes = notes;
  if (organDonor !== undefined) user.emergencyInfo.organDonor = Boolean(organDonor);
  if (primaryPhysician !== undefined) user.emergencyInfo.primaryPhysician = primaryPhysician;
  if (insuranceInfo !== undefined) user.emergencyInfo.insuranceInfo = insuranceInfo;
  if (isEnabled !== undefined) user.emergencyInfo.isEnabled = Boolean(isEnabled);

  if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
  if (allergies !== undefined) {
    user.allergies = Array.isArray(allergies) ? allergies : [allergies];
  }
  if (emergencyContacts !== undefined) {
    user.emergencyContacts = Array.isArray(emergencyContacts)
      ? emergencyContacts
      : [];
  }

  await user.save();

  const emergencyUrl = getEmergencyUrl(req, user.emergencyToken);
  const qrCodeDataUrl = await generateQRCodeDataURL(emergencyUrl);

  res.status(200).json({
    status: 'success',
    message: 'Emergency medical information updated successfully.',
    data: {
      emergencyToken: user.emergencyToken,
      emergencyUrl,
      qrCodeDataUrl,
      emergencyInfo: user.emergencyInfo,
      bloodGroup: user.bloodGroup,
      allergies: user.allergies,
      emergencyContacts: user.emergencyContacts,
    },
  });
});

/**
 * Authenticated Endpoint: Regenerate emergency token
 * Invalidates the previous QR code in case the card/sticker was lost or compromised.
 */
const regenerateEmergencyToken = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError('User not found.', 404);

  user.emergencyToken = crypto.randomBytes(16).toString('hex');
  await user.save();

  const emergencyUrl = getEmergencyUrl(req, user.emergencyToken);
  const qrCodeDataUrl = await generateQRCodeDataURL(emergencyUrl);

  res.status(200).json({
    status: 'success',
    message: 'New emergency token and QR code generated. Previous QR code invalidated.',
    data: {
      emergencyToken: user.emergencyToken,
      emergencyUrl,
      qrCodeDataUrl,
    },
  });
});

/**
 * Authenticated Endpoint: Retrieve access logs for patient's emergency QR code
 */
const getEmergencyAccessLogs = catchAsync(async (req, res) => {
  const user = await User.findById(req.user.userId).select('emergencyAccessLogs');
  if (!user) throw new AppError('User not found.', 404);

  const logs = (user.emergencyAccessLogs || []).sort(
    (a, b) => new Date(b.accessedAt) - new Date(a.accessedAt)
  );

  res.status(200).json({
    status: 'success',
    results: logs.length,
    data: logs,
  });
});

export {
  getEmergencyProfileByToken,
  getMyEmergencyProfile,
  getEmergencyQRCode,
  updateEmergencyInfo,
  regenerateEmergencyToken,
  getEmergencyAccessLogs,
};
