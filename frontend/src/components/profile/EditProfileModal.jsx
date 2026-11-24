import React, { useState, useEffect } from 'react';
import {
  X, User, Droplets, Phone, AlertTriangle, Heart, Stethoscope,
  Building2, Shield, Plus, Trash2, Save, RefreshCw, ChevronDown, ChevronUp,
  MapPin, Navigation, Compass, CheckCircle2
} from 'lucide-react';
import { authApi } from '../../api/auth';
import { emergencyApi } from '../../api/emergency';
import { useToast } from '../../context/ToastContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function SectionHeader({ icon: Icon, label, color = 'text-trust-600', expanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 border-b border-slate-100 group"
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-bold text-navy-900">{label}</span>
      </div>
      {expanded ? (
        <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
      )}
    </button>
  );
}

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated, onUpdateSuccess }) {
  const toast = useToast();

  // ── Basic Info ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  // ── Location & GPS ──────────────────────────────────────────
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isLocationAllowed, setIsLocationAllowed] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // ── Allergies (dynamic list) ────────────────────────────────
  const [allergies, setAllergies] = useState([]);
  const [allergyInput, setAllergyInput] = useState('');

  // ── Emergency Contacts (dynamic list) ──────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState([]);

  // ── Emergency Info ──────────────────────────────────────────
  const [criticalConditions, setCriticalConditions] = useState([]);
  const [conditionInput, setConditionInput] = useState('');
  const [notes, setNotes] = useState('');
  const [organDonor, setOrganDonor] = useState(false);
  const [isEmergencyEnabled, setIsEmergencyEnabled] = useState(true);

  // ── Primary Physician ───────────────────────────────────────
  const [physicianName, setPhysicianName] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [physicianHospital, setPhysicianHospital] = useState('');

  // ── Insurance ───────────────────────────────────────────────
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');

  // ── Doctor-specific ─────────────────────────────────────────
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  // ── UI State ─────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [openSections, setOpenSections] = useState({
    basic: true,
    location: true,
    allergies: true,
    emergency: true,
    contacts: true,
    physician: false,
    insurance: false,
    doctor: false,
  });

  // Hydrate form from user object on open
  useEffect(() => {
    if (!isOpen || !user) return;

    setName(user.name || '');
    setAge(user.age?.toString() || '');
    setBloodGroup(user.bloodGroup || 'O+');
    setAllergies(user.allergies || []);
    setEmergencyContacts(
      (user.emergencyContacts || []).map((c) => ({
        name: c.name || '',
        relationship: c.relationship || '',
        phone: c.phone || '',
      }))
    );

    const loc = user.location || {};
    setAddress(loc.address || '');
    setCity(loc.city || '');
    setState(loc.state || '');
    setCountry(loc.country || 'India');
    setPostalCode(loc.postalCode || '');
    setLatitude(loc.latitude ?? null);
    setLongitude(loc.longitude ?? null);
    setAccuracy(loc.accuracy ?? null);
    setIsLocationAllowed(Boolean(loc.isAllowed));

    const info = user.emergencyInfo || {};
    setCriticalConditions(info.criticalConditions || []);
    setNotes(info.notes || '');
    setOrganDonor(Boolean(info.organDonor));
    setIsEmergencyEnabled(info.isEnabled !== false);
    setPhysicianName(info.primaryPhysician?.name || '');
    setPhysicianPhone(info.primaryPhysician?.phone || '');
    setPhysicianHospital(info.primaryPhysician?.hospital || '');
    setInsuranceProvider(info.insuranceInfo?.provider || '');
    setInsurancePolicyNumber(info.insuranceInfo?.policyNumber || '');

    setSpecialization(user.specialization || '');
    setLicenseNumber(user.licenseNumber || '');
  }, [isOpen, user]);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Not Supported', 'Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
        setLatitude(lat);
        setLongitude(lon);
        setAccuracy(acc);
        setIsLocationAllowed(true);

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.village || addr.suburb || '';
            const detectedState = addr.state || '';
            const detectedCountry = addr.country || 'India';
            const detectedPostal = addr.postcode || '';

            if (detectedCity) setCity(detectedCity);
            if (detectedState) setState(detectedState);
            if (detectedCountry) setCountry(detectedCountry);
            if (detectedPostal) setPostalCode(detectedPostal);
            if (data.display_name && !address) setAddress(data.display_name);
          }
        } catch (revErr) {
          console.warn('Reverse geocoding warning:', revErr.message);
        }

        toast.success(
          'Location Allowed & Detected',
          `Coordinates captured (${lat.toFixed(4)}, ${lon.toFixed(4)}).`
        );
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          toast.warning(
            'Location Access Denied',
            'Browser location permission was denied. You can manually enter your city and address.'
          );
        } else {
          toast.error('Location Error', err.message || 'Could not fetch current coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleRevokeLocation = () => {
    setIsLocationAllowed(false);
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    toast.info('Location Access Revoked', 'Coordinates cleared. You can re-enable anytime.');
  };

  if (!isOpen) return null;

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Allergy helpers ─────────────────────────────────────────
  const addAllergy = () => {
    const val = allergyInput.trim();
    if (!val || allergies.includes(val)) return;
    setAllergies((prev) => [...prev, val]);
    setAllergyInput('');
  };
  const removeAllergy = (idx) => setAllergies((prev) => prev.filter((_, i) => i !== idx));

  // ── Condition helpers ────────────────────────────────────────
  const addCondition = () => {
    const val = conditionInput.trim();
    if (!val || criticalConditions.includes(val)) return;
    setCriticalConditions((prev) => [...prev, val]);
    setConditionInput('');
  };
  const removeCondition = (idx) =>
    setCriticalConditions((prev) => prev.filter((_, i) => i !== idx));

  // ── Emergency Contact helpers ─────────────────────────────────
  const addContact = () =>
    setEmergencyContacts((prev) => [...prev, { name: '', relationship: '', phone: '' }]);
  const removeContact = (idx) =>
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== idx));
  const updateContact = (idx, field, val) =>
    setEmergencyContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name Required', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      // 1. Update basic profile via PATCH /api/users/:id
      const profilePayload = {
        name: name.trim(),
        age: age ? Number(age) : undefined,
        bloodGroup,
        allergies,
        emergencyContacts: emergencyContacts.filter((c) => c.name),
        location: {
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          postalCode: postalCode.trim(),
          latitude: latitude !== null ? Number(latitude) : undefined,
          longitude: longitude !== null ? Number(longitude) : undefined,
          accuracy: accuracy !== null ? Number(accuracy) : undefined,
          isAllowed: isLocationAllowed,
        },
      };
      if (user.role === 'doctor') {
        profilePayload.specialization = specialization;
        profilePayload.licenseNumber = licenseNumber;
      }

      const profileRes = await authApi.updateProfile(user._id, profilePayload);

      // 2. Update emergency info via PATCH /api/emergency/me
      const emergencyPayload = {
        criticalConditions,
        notes: notes.trim(),
        organDonor,
        isEnabled: isEmergencyEnabled,
        bloodGroup,
        allergies,
        emergencyContacts: emergencyContacts.filter((c) => c.name),
        primaryPhysician: {
          name: physicianName.trim(),
          phone: physicianPhone.trim(),
          hospital: physicianHospital.trim(),
        },
        insuranceInfo: {
          provider: insuranceProvider.trim(),
          policyNumber: insurancePolicyNumber.trim(),
        },
      };

      await emergencyApi.updateEmergencyInfo(emergencyPayload);

      const updatedUser = profileRes.data || profileRes;
      toast.success('Profile Saved', 'Your health profile and emergency info have been updated.');
      if (onProfileUpdated) onProfileUpdated(updatedUser);
      if (onUpdateSuccess) onUpdateSuccess(updatedUser);
      onClose();
    } catch (err) {
      toast.error('Save Failed', err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 my-8 flex flex-col max-h-[90vh]">

        {/* ── Sticky Header ── */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-trust-50 text-trust-600 flex items-center justify-center border border-trust-100">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-navy-900">Edit Health Profile</h3>
              <p className="text-xs text-slate-500">Update personal info, emergency vitals & contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

          {/* ── BASIC INFORMATION ── */}
          <SectionHeader
            icon={User}
            label="Basic Information"
            expanded={openSections.basic}
            onToggle={() => toggleSection('basic')}
          />
          {openSections.basic && (
            <div className="pt-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Age
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 34"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── LOCATION & GEOLOCATION ── */}
          <SectionHeader
            icon={MapPin}
            label="Location & Geolocation Services"
            color="text-emerald-600"
            expanded={openSections.location}
            onToggle={() => toggleSection('location')}
          />
          {openSections.location && (
            <div className="pt-3 pb-2 space-y-4">
              {/* Permission Banner & Action Button */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isLocationAllowed
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLocationAllowed
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-navy-900">
                          Browser Geolocation Access
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isLocationAllowed
                              ? 'bg-emerald-200/80 text-emerald-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isLocationAllowed ? 'Allowed' : 'Not Allowed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isLocationAllowed
                          ? latitude !== null && longitude !== null
                            ? `GPS active: ${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)} (±${Math.round(accuracy || 0)}m)`
                            : 'Location access is enabled for this profile.'
                          : 'Allow browser location to auto-detect nearby doctors, emergency facilities, and clinic slots.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRequestLocation}
                      disabled={detectingLocation}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                        isLocationAllowed
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-trust-600 hover:bg-trust-700 text-white'
                      }`}
                    >
                      {detectingLocation ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Detecting GPS...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5" />
                          <span>{isLocationAllowed ? 'Update GPS' : 'Allow Location'}</span>
                        </>
                      )}
                    </button>

                    {isLocationAllowed && (
                      <button
                        type="button"
                        onClick={handleRevokeLocation}
                        className="px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 text-xs font-semibold transition"
                        title="Revoke location permission"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Fields Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Street Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 42 Park Avenue, Connaught Place"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Delhi / Maharashtra"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Postal / PIN Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 110001"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                </div>
              </div>

              {/* Coordinates Preview (if available) */}
              {latitude !== null && longitude !== null && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 text-slate-600 text-[11px] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-trust-600 shrink-0" />
                  <span>Lat: {Number(latitude).toFixed(5)}</span>
                  <span>•</span>
                  <span>Lon: {Number(longitude).toFixed(5)}</span>
                  {accuracy && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">Accuracy: ±{Math.round(accuracy)}m</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ALLERGIES ── */}
          <SectionHeader
            icon={AlertTriangle}
            label="Allergies & Contraindications"
            color="text-amber-600"
            expanded={openSections.allergies}
            onToggle={() => toggleSection('allergies')}
          />
          {openSections.allergies && (
            <div className="pt-3 pb-2 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  placeholder="e.g. Penicillin, Latex, Peanuts"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
                    >
                      ⚠️ {a}
                      <button
                        type="button"
                        onClick={() => removeAllergy(i)}
                        className="text-amber-500 hover:text-amber-800 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {allergies.length === 0 && (
                <p className="text-xs text-slate-400 italic">No allergies added yet. Type above and press Enter or click +.</p>
              )}
            </div>
          )}

          {/* ── EMERGENCY INFORMATION ── */}
          <SectionHeader
            icon={Heart}
            label="Emergency Medical Information"
            color="text-rose-600"
            expanded={openSections.emergency}
            onToggle={() => toggleSection('emergency')}
          />
          {openSections.emergency && (
            <div className="pt-3 pb-2 space-y-4">
              {/* Critical Conditions */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Critical Medical Conditions
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                    placeholder="e.g. Type 1 Diabetes, Asthma, Epilepsy"
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                  />
                  <button
                    type="button"
                    onClick={addCondition}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {criticalConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {criticalConditions.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
                      >
                        ⚡ {c}
                        <button
                          type="button"
                          onClick={() => removeCondition(i)}
                          className="text-rose-400 hover:text-rose-700 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Critical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  First Responder Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder='e.g. "Carries EpiPen in backpack. Requires insulin within 1 hour."'
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-700">Registered Organ Donor</span>
                  <input
                    type="checkbox"
                    checked={organDonor}
                    onChange={(e) => setOrganDonor(e.target.checked)}
                    className="w-4 h-4 text-trust-600 rounded border-slate-300 focus:ring-trust-500"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <span className="text-xs font-semibold text-slate-700">Enable PranaSetu (Emergency QR) Access</span>
                  <input
                    type="checkbox"
                    checked={isEmergencyEnabled}
                    onChange={(e) => setIsEmergencyEnabled(e.target.checked)}
                    className="w-4 h-4 text-trust-600 rounded border-slate-300 focus:ring-trust-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── EMERGENCY CONTACTS ── */}
          <SectionHeader
            icon={Phone}
            label="Emergency Contacts"
            color="text-emerald-600"
            expanded={openSections.contacts}
            onToggle={() => toggleSection('contacts')}
          />
          {openSections.contacts && (
            <div className="pt-3 pb-2 space-y-3">
              {emergencyContacts.map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Contact {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                      placeholder="Full Name"
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
                    />
                    <input
                      type="text"
                      value={c.relationship}
                      onChange={(e) => updateContact(i, 'relationship', e.target.value)}
                      placeholder="Relationship"
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
                    />
                    <input
                      type="tel"
                      value={c.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-trust-500"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addContact}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 text-xs font-bold hover:border-trust-400 hover:text-trust-600 hover:bg-trust-50 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Emergency Contact</span>
              </button>
            </div>
          )}

          {/* ── PRIMARY PHYSICIAN ── */}
          <SectionHeader
            icon={Stethoscope}
            label="Primary Care Physician"
            color="text-trust-600"
            expanded={openSections.physician}
            onToggle={() => toggleSection('physician')}
          />
          {openSections.physician && (
            <div className="pt-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Doctor's Full Name
                </label>
                <input
                  type="text"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  placeholder="Dr. Jane Smith, MD"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={physicianPhone}
                  onChange={(e) => setPhysicianPhone(e.target.value)}
                  placeholder="+1 (555) 876-5432"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  Hospital / Clinic
                </label>
                <input
                  type="text"
                  value={physicianHospital}
                  onChange={(e) => setPhysicianHospital(e.target.value)}
                  placeholder="Metro Health Medical Center"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
            </div>
          )}

          {/* ── INSURANCE ── */}
          <SectionHeader
            icon={Shield}
            label="Health Insurance"
            color="text-indigo-600"
            expanded={openSections.insurance}
            onToggle={() => toggleSection('insurance')}
          />
          {openSections.insurance && (
            <div className="pt-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="BlueCross Apex Shield"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Policy Number
                </label>
                <input
                  type="text"
                  value={insurancePolicyNumber}
                  onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                  placeholder="BC-98421008-01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                />
              </div>
            </div>
          )}

          {/* ── DOCTOR CREDENTIALS (only for doctors) ── */}
          {user?.role === 'doctor' && (
            <>
              <SectionHeader
                icon={Stethoscope}
                label="Doctor Credentials"
                color="text-trust-600"
                expanded={openSections.doctor}
                onToggle={() => toggleSection('doctor')}
              />
              {openSections.doctor && (
                <div className="pt-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="Cardiology, Oncology..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Medical License #
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="MED-CA-998124"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-trust-500 transition"
                    />
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-trust-600 text-white text-sm font-bold hover:bg-trust-700 transition shadow-sm shadow-trust-600/30 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
