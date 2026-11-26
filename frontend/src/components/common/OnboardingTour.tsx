import React, { useState, useEffect, useCallback, CSSProperties } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  QrCode,
  Radio,
  MessageSquare,
  Bot,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

export interface TourStep {
  id: string;
  selector: string;
  mobileSelector?: string;
  mobileSidebar?: boolean;
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'medical-records',
    selector: '[data-tour="medical-records"]',
    mobileSidebar: true,
    badge: 'Encrypted Vault',
    title: 'Medical Records Vault',
    description:
      'Store lab reports, prescriptions, and imaging scans in one encrypted vault with instant AI-powered clinical summaries.',
    icon: FileText,
    accent: 'from-trust-600 to-blue-600',
  },
  {
    id: 'pranasetu',
    selector: '[data-tour="pranasetu"]',
    mobileSidebar: true,
    badge: 'Emergency Access',
    title: 'PranaSetu Emergency QR',
    description:
      'Generate your life-saving emergency QR card so paramedics and doctors can view critical allergies, blood group, and contacts instantly.',
    icon: QrCode,
    accent: 'from-rose-600 to-pink-600',
  },
  {
    id: 'jagruti-alerts',
    selector: '[data-tour="jagruti-alerts"]',
    mobileSidebar: true,
    badge: 'Disease Radar',
    title: 'Jagruti Disease Hotspot Map',
    description:
      'Explore privacy-preserving H3 regional disease activity zones and receive smart public-health advisories for your area.',
    icon: Radio,
    accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'doctor-chat',
    selector: '[data-tour="doctor-chat"]',
    mobileSidebar: true,
    badge: 'Teleconsultation',
    title: 'Doctor Chat & Consultations',
    description:
      'Message verified doctors directly, share selected medical records securely, and manage your appointments in one place.',
    icon: MessageSquare,
    accent: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'ai-copilot',
    selector: '[data-tour="ai-copilot"]',
    mobileSelector: '[data-tour="ai-copilot-mobile"]',
    mobileSidebar: false,
    badge: 'AI Copilot',
    title: 'Aarogya AI Health Copilot',
    description:
      'Chat or start a live voice call in English or Indic languages to understand your records, check prescriptions, and get health guidance.',
    icon: Bot,
    accent: 'from-indigo-600 to-violet-600',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose?: () => void;
  steps?: TourStep[];
  onSetSidebarOpen?: (open: boolean) => void;
}

export default function OnboardingTour({
  isOpen,
  onClose,
  steps = DEFAULT_TOUR_STEPS,
  onSetSidebarOpen,
}: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const measureTarget = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const isMobile = window.innerWidth < 768;
    const selector =
      isMobile && currentStep.mobileSelector
        ? currentStep.mobileSelector
        : currentStep.selector;

    const el = document.querySelector(selector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      return;
    }

    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    });
  }, [isOpen, currentStep]);

  // Open/close mobile sidebar automatically if needed for sidebar targets
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    setStepIndex((prev) => (prev >= steps.length ? 0 : prev));

    if (window.innerWidth < 1024 && onSetSidebarOpen) {
      onSetSidebarOpen(Boolean(currentStep.mobileSidebar));
    }

    const timer = setTimeout(() => {
      measureTarget();
    }, 260);

    return () => clearTimeout(timer);
  }, [isOpen, stepIndex, currentStep, steps.length, onSetSidebarOpen, measureTarget]);

  // Re-measure on resize or scroll
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, measureTarget]);

  const handleFinish = () => {
    if (window.innerWidth < 1024 && onSetSidebarOpen) {
      onSetSidebarOpen(false);
    }
    setStepIndex(0);
    onClose?.();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!isOpen || !currentStep) return null;

  const StepIcon = currentStep.icon || Sparkles;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Determine optimal tooltip position relative to targetRect
  const cardWidth = Math.min(360, vw - 32);
  let cardStyle: CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: `${cardWidth}px`,
  };
  let arrowSide: 'left' | 'right' | 'top' | 'bottom' | 'none' = 'none';

  if (targetRect) {
    const spaceRight = vw - targetRect.right;
    const spaceLeft = targetRect.left;
    const spaceTop = targetRect.top;
    const spaceBottom = vh - targetRect.bottom;

    if (spaceRight >= cardWidth + 36) {
      // Place card to the right of target (desktop sidebar items)
      const idealTop = Math.min(Math.max(20, targetRect.top - 24), vh - 290);
      cardStyle = {
        top: `${idealTop}px`,
        left: `${targetRect.right + 28}px`,
        width: `${cardWidth}px`,
      };
      arrowSide = 'left';
    } else if (spaceLeft >= cardWidth + 36) {
      // Place card to the left of target (floating AI Copilot button)
      const idealTop = Math.min(Math.max(20, targetRect.top - 120), vh - 290);
      cardStyle = {
        top: `${idealTop}px`,
        left: `${targetRect.left - cardWidth - 28}px`,
        width: `${cardWidth}px`,
      };
      arrowSide = 'right';
    } else if (spaceTop >= 270) {
      // Place above target (mobile bottom nav)
      const idealLeft = Math.min(Math.max(16, targetRect.left + targetRect.width / 2 - cardWidth / 2), vw - cardWidth - 16);
      cardStyle = {
        bottom: `${vh - targetRect.top + 24}px`,
        left: `${idealLeft}px`,
        width: `${cardWidth}px`,
      };
      arrowSide = 'bottom';
    } else if (spaceBottom >= 260) {
      // Place below target
      const idealLeft = Math.min(Math.max(16, targetRect.left + targetRect.width / 2 - cardWidth / 2), vw - cardWidth - 16);
      cardStyle = {
        top: `${targetRect.bottom + 24}px`,
        left: `${idealLeft}px`,
        width: `${cardWidth}px`,
      };
      arrowSide = 'top';
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="AyuRaksha Feature Walkthrough"
    >
      {/* Backdrop when no target is measured */}
      {!targetRect && (
        <div
          className="fixed inset-0 bg-navy-900/75 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={handleFinish}
        />
      )}

      {/* Spotlight Cutout + Pulsing Highlight Ring */}
      {targetRect && (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-500 ease-out"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: '0 0 0 9999px rgba(11, 17, 32, 0.74)',
          }}
        >
          <div className="absolute inset-0 rounded-2xl ring-2 ring-white/90 animate-pulse" />
          <div className="absolute -inset-1.5 rounded-2xl border-2 border-trust-400/70 animate-ping opacity-40" />
        </div>
      )}

      {/* Floating Tour Card with Animated Directional Arrow */}
      <div
        className="fixed z-[101] transition-all duration-500 ease-out"
        style={cardStyle}
      >
        {/* Animated Arrow pointing LEFT toward target */}
        {arrowSide === 'left' && (
          <div className="hidden sm:flex items-center absolute -left-8 top-8 text-white animate-bounce">
            <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
              <path
                d="M26 12H4M4 12L12 4M4 12L12 20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Animated Arrow pointing RIGHT toward target */}
        {arrowSide === 'right' && (
          <div className="hidden sm:flex items-center absolute -right-8 bottom-10 text-white animate-bounce">
            <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
              <path
                d="M2 12H24M24 12L16 4M24 12L16 20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Animated Arrow pointing DOWN toward target */}
        {arrowSide === 'bottom' && (
          <div className="flex justify-center absolute -bottom-8 inset-x-0 text-white animate-bounce">
            <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
              <path
                d="M12 2V24M12 24L4 16M12 24L20 16"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Animated Arrow pointing UP toward target */}
        {arrowSide === 'top' && (
          <div className="flex justify-center absolute -top-8 inset-x-0 text-white animate-bounce">
            <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
              <path
                d="M12 26V4M12 4L4 12M12 4L20 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
          {/* Top Progress Bar */}
          <div className="h-1.5 w-full bg-slate-100">
            <div
              className={`h-full bg-gradient-to-r ${currentStep.accent} transition-all duration-500`}
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-5 space-y-3.5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${currentStep.accent} text-white flex items-center justify-center shadow-md shrink-0`}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-trust-600 bg-trust-50 px-2 py-0.5 rounded-full">
                    {currentStep.badge}
                  </span>
                  <h4 className="text-base font-black text-navy-900 mt-0.5">
                    {currentStep.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                aria-label="Skip tour"
                className="p-1.5 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentStep.description}
            </p>

            {/* Footer Controls */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to step ${idx + 1}`}
                    onClick={() => setStepIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === stepIndex
                        ? 'w-5 bg-trust-600'
                        : 'w-2 bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700 transition"
                  >
                    Skip
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={`px-3.5 py-1.5 rounded-xl bg-gradient-to-r ${currentStep.accent} text-white text-xs font-extrabold shadow-sm hover:opacity-95 flex items-center gap-1.5 transition`}
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Get Started</span>
                    </>
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
