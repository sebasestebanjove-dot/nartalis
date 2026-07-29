"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Crown, LogOut, Loader2, MapPin, Zap, CheckCircle, AlertTriangle, AlertCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import type { DermoProduct, DermoView, DermoUserRoutine, UserType, DashboardData, AnalyzeResult } from './types';
import { searchDermoProducts, analyzeDermoProduct, activateRoutine } from './api';
import { dermoStyles, colorVars } from './styles';
import DermoHomeScreen from './screens/DermoHomeScreen';
import DermaPanel from './screens/DermaPanel';
import DermoSearchScreen from './screens/DermoSearchScreen';
import DermoResultsScreen from './screens/DermoResultsScreen';
import DermoDetailScreen from './screens/DermoDetailScreen';
import DermoQuizScreen from './screens/DermoQuizScreen';
import DermoAdvancedQuizScreen from './screens/DermoAdvancedQuizScreen';
import DermoPaywallScreen from './DermoPaywallScreen';
import ChatConversation from './components/ChatConversation';
import FitScoreBadge from './components/FitScoreBadge';
import LocationBadge from './components/LocationBadge';

export default function DermoWrapper() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>('anonymous');
  const [userEmail, setUserEmail] = useState('');
  const [consultasConsumidas, setConsultasConsumidas] = useState(0);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState<DermoView>('home');
  const [searchResults, setSearchResults] = useState<DermoProduct[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [routineResult, setRoutineResult] = useState<DermoUserRoutine | null>(null);
  const [routineActivating, setRoutineActivating] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [googleCp, setGoogleCp] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [farmaciasCount, setFarmaciasCount] = useState(0);
  const [showCpModal, setShowCpModal] = useState(false);
  const [cpInput, setCpInput] = useState('');
  const [cpBusy, setCpBusy] = useState(false);
  const [cpError, setCpError] = useState('');
  const [showAnonPaywall, setShowAnonPaywall] = useState(false);
  const [paywallView, setPaywallView] = useState<'login' | 'register'>('register');

  // Load CP from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dermo_cp');
      if (saved) {
        setCodigoPostal(saved);
        setCpInput(saved);
      }
    } catch { /* ignore */ }
  }, []);

  // Save/restore analyze state across page reloads (dev-login, etc.)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('dermo_analyze_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.analyzeResult && parsed.view === 'analyze') {
          setAnalyzeResult(parsed.analyzeResult);
          // Don't set view yet — wait for session check
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (analyzeResult && view === 'analyze') {
      try {
        sessionStorage.setItem('dermo_analyze_state', JSON.stringify({ analyzeResult, view, analyzeError }));
      } catch { /* ignore */ }
    }
  }, [analyzeResult, view, analyzeError]);

  useEffect(() => {
    fetch('/api/dermo/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          const isAdmin = data.user.email === 'sebasestebanjove@gmail.com';
          const isPremium = !!(data.user.is_premium || isAdmin);
          setUserType(isPremium ? 'premium' : 'free');
          setUserEmail(data.user.email);
          setConsultasConsumidas(data.user.consultas_consumidas ?? 0);
          // Load CP from session data, fallback to localStorage
          const cpFromSession = data.user.codigo_postal || '';
          if (cpFromSession) {
            setCodigoPostal(cpFromSession);
            setCpInput(cpFromSession);
            try { localStorage.setItem('dermo_cp', cpFromSession); } catch {}
          }

          // Restore analyze view from sessionStorage if available
          const saved = sessionStorage.getItem('dermo_analyze_state');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.analyzeResult && parsed.view === 'analyze') {
                setAnalyzeResult(parsed.analyzeResult);
                setAnalyzeError(parsed.analyzeError || '');
                setView('analyze');
                sessionStorage.removeItem('dermo_analyze_state');
                return;
              }
            } catch { /* ignore */ }
          }

          setView('dashboard');
          setDashboardLoading(true);
          fetch('/api/dermo/dashboard')
            .then(r => r.json())
            .then(dd => setDashboardData(dd))
            .catch(() => {})
            .finally(() => setDashboardLoading(false));
          if (!isPremium && window.location.search.includes('premium=activate')) {
            fetch('/api/dermo/premium/activate', { method: 'POST' })
              .then(r => r.ok && setUserType('premium'))
              .catch(() => {});
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (userType === 'anonymous') setView('dashboard');
        setCheckingAuth(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/dermo/auth/logout', { method: 'POST' });
    window.location.href = '/farma';
  };

  const handleActivatePremium = () => {
    setUserType('premium');
    setShowPaywall(false);
  };

  const handleCpChange = async () => {
    if (!/^\d{5}$/.test(cpInput.replace(/\s/g, ''))) {
      setCpError('Código postal inválido (5 dígitos)');
      return;
    }
    setCpBusy(true);
    setCpError('');
    const cp = cpInput.replace(/\s/g, '');
    try {
      // Try to save to backend if authenticated
      if (isAuthenticated()) {
        await fetch('/api/dermo/auth/google/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codigo_postal: cp }),
        }).catch(() => {});
      }
      setCodigoPostal(cp);
      try { localStorage.setItem('dermo_cp', cp); } catch {}
      setShowCpModal(false);
      // Fetch farmacia count for this CP
      fetch(`/api/dermo/pharmacies/count?cp=${cp}`)
        .then(r => r.json())
        .then(d => setFarmaciasCount(d.count ?? 0))
        .catch(() => {});
    } catch {
      setCpError('Error al guardar el código postal');
    } finally {
      setCpBusy(false);
    }
  };

  const handleSearch = useCallback(async (query: string, skinType: string, brand: string) => {
    setLoading(true);
    setError('');
    setSearchQuery(query);
    setSearchResults([]);
    setSearchTotal(0);
    try {
      const data = await searchDermoProducts(query, skinType, brand);
      setSearchResults(data.results);
      setSearchTotal(data.total);
      setView('results');
    } catch (err: any) {
      setError(err.message || 'Error al buscar');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyzeSearch = useCallback(async (query: string) => {
    if (analyzeLoading) return;
    setAnalyzeLoading(true);
    setAnalyzeError('');
    setAnalyzeResult(null);
    setImageLoading(true);
    setImgError(false);
    setShowIngredientsModal(false);
    try {
      const result = await analyzeDermoProduct(query);
      console.log("=== DIAGNÓSTICO FRONTEND DERMO IA ===");
      console.log("Objeto completo recibido del backend:", result);
      const hasImage = result && (result.image_front_url || result.image_url || result.image_ingredients_url);
      if (hasImage) {
        setImageLoading(true);
      } else {
        setImageLoading(false);
      }
      setImgError(false);
      setAnalyzeResult(result);
      setView('analyze');
    } catch (err: any) {
      setAnalyzeError(err.message || 'Error al analizar');
    } finally {
      setAnalyzeLoading(false);
    }
  }, [analyzeLoading]);

  const handleSelect = useCallback((product: DermoProduct) => {
    setSelectedProductId(product.id);
    setView('detail');
  }, []);

  const handleStartSearch = useCallback(() => {
    setView('search');
  }, []);

  const handleStartQuiz = useCallback(() => {
    if (userType === 'premium') {
      setView('advancedQuiz');
    } else {
      setView('quiz');
    }
  }, [userType]);

  const handleStartAdvancedQuiz = useCallback(() => {
    setView('advancedQuiz');
  }, []);

  const handleQuizComplete = useCallback((result: DermoUserRoutine) => {
    if (result.is_completed) {
      setRoutineResult(result);
      setRoutineName(result.name || '');
      setView('routine');
    } else {
      setShowPaywall(true);
    }
  }, []);

  const handleActivateRoutine = useCallback(async () => {
    if (!routineResult) return;
    setRoutineActivating(true);
    const finalName = routineName.trim() || routineResult.name || 'Rutina personalizada';

    const res = await activateRoutine(routineResult.id, finalName);
    if (res.ok && res.routine) {
      setDashboardData(prev => prev ? { ...prev, latest_routine: res.routine } : prev);
    } else {
      // fallback con datos del generate si la API falla
      setDashboardData(prev => prev ? {
        ...prev,
        latest_routine: { ...routineResult, name: finalName, status: 'active' } as DermoUserRoutine,
      } : prev);
    }
    setView('dashboard');
    setRoutineActivating(false);
  }, [routineResult, routineName]);

  const handleRoutineRestored = useCallback((routine: DermoUserRoutine) => {
    setDashboardData(prev => prev ? { ...prev, latest_routine: routine } : prev);
    setView('dashboard');
  }, []);

  const handleBack = useCallback(() => {
    const isAuthed = userType === 'free' || userType === 'premium';
    if (isAuthed) {
      if (view === 'analyze') {
        // keep analyzeResult for later reference
        setView('dashboard');
        setSelectedProductId(null);
        setSearchResults([]);
        setSearchQuery('');
        return;
      }
      const wasInRoutine = view === 'routine' || view === 'quiz' || view === 'advancedQuiz';
      setView('dashboard');
      setSelectedProductId(null);
      setSearchResults([]);
      setSearchQuery('');
      setRoutineResult(null);
      // Re-fetch dashboard to reflect any changes (e.g. routine generated without activating)
      if (wasInRoutine) {
        setDashboardLoading(true);
        fetch('/api/dermo/dashboard')
          .then(r => r.json())
          .then(dd => setDashboardData(dd))
          .catch(() => {})
          .finally(() => setDashboardLoading(false));
      }
    } else if (view === 'detail' || view === 'analyze') {
      setView('results');
      setSelectedProductId(null);
    } else if (view === 'results') {
      setView('search');
      setSearchResults([]);
      setSearchQuery('');
    } else {
      setView('dashboard');
      setRoutineResult(null);
    }
  }, [view, userType]);

  const handleGoogleCpSubmit = async () => {
    if (!/^\d{5}$/.test(googleCp.replace(/\s/g, ''))) {
      setGoogleError('Código postal inválido (5 dígitos)');
      return;
    }
    setGoogleBusy(true);
    setGoogleError('');
    try {
      const res = await fetch('/api/dermo/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_postal: googleCp.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      window.location.href = '/farma/dermo';
    } catch (err: any) {
      setGoogleError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colorVars.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colorVars.fgMuted,
        fontSize: 15,
        gap: 8,
      }}>
        <Loader2 size={20} style={{ animation: 'dermoSpin 0.8s linear infinite' }} />
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colorVars.bg }}>
      {isAuthenticated() && renderTopBar()}

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
        {checkingAuth ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '4rem 1rem', color: colorVars.fgMuted, fontSize: 14, gap: 8,
            background: colorVars.bg, minHeight: '60vh',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `2px solid ${colorVars.border}`,
              borderTopColor: colorVars.premiumLight,
              animation: 'dermoSpin 0.8s linear infinite',
            }} />
            Cargando...
          </div>
        ) : (
          renderContent()
        )}
        {showPaywall && renderPaywallModal()}
      </div>

      {renderGoogleModal()}
      {renderCpModal()}

      {/* Paywall overlay for anonymous users (login/register) */}
      {showAnonPaywall && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column',
          animation: 'dermoFadeIn 0.25s ease-out',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          }} onClick={() => setShowAnonPaywall(false)} />
          <div style={{
            position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setShowAnonPaywall(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                width: 40, height: 40, borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(8px)',
              }}
              aria-label="Cerrar"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <DermoPaywallScreen initialView={paywallView} onClose={() => setShowAnonPaywall(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function isAuthenticated() {
    return userType === 'free' || userType === 'premium';
  }

  function renderTopBar() {
    const isAnon = userType === 'anonymous';
    const isPrem = userType === 'premium';

    return (
      <div style={dermoStyles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPrem && !isAnon && (
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: colorVars.premiumGlow,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Sparkles size={14} color={colorVars.premiumLight} />
            </div>
          )}
          {!isPrem && !isAnon && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg, lineHeight: 1.2 }}>
                Dermofarmacia Premium
              </div>
              <div style={{ fontSize: 11, color: colorVars.premiumLight, fontWeight: 600 }}>5€/mes</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPrem && !isAnon && (
            <button
              onClick={() => setShowPaywall(true)}
              aria-label="Desbloquear Premium"
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px',
                borderRadius: 20, border: 'none',
                background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
            >
              <Zap size={12} /> Desbloquear
            </button>
          )}

          {isAnon ? (
            <button onClick={() => window.location.reload()} style={dermoStyles.topbarBtn}>
              Iniciar sesión
            </button>
          ) : (
            <>
              <div style={dermoStyles.topbarEmail}>
                <div style={dermoStyles.topbarDot} />
                {userEmail}
              </div>

              {isPrem ? (
                <div style={dermoStyles.topbarBadgePremium}>
                  <Crown size={10} /> Premium
                </div>
              ) : (
                <div style={dermoStyles.topbarBadgeFree}>
                  Plan Gratuito
                </div>
              )}

              <LocationBadge
                codigoPostal={codigoPostal}
                farmaciasCount={farmaciasCount}
                onChangeCp={() => { setCpInput(codigoPostal); setCpError(''); setShowCpModal(true); }}
              />

              {userEmail === 'sebasestebanjove@gmail.com' && (
                <a
                  href="/admin"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 14px', borderRadius: 20, border: 'none',
                    background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                    color: '#fff', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    textDecoration: 'none',
                    transition: 'opacity 0.15s',
                  }}
                >
                  Panel Admin
                </a>
              )}

              <button
                onClick={handleLogout}
                style={dermoStyles.topbarBtn}
                aria-label="Cerrar sesión"
              >
                <LogOut size={11} style={{ marginRight: 3 }} /> Salir
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderContent() {
    switch (view) {
      case 'dashboard':
        return (
          <div style={{ height: '100%' }}>
            <DermaPanel
              userType={userType}
              userEmail={userEmail}
              consultasConsumidas={consultasConsumidas}
              dashboardData={dashboardData}
              loading={dashboardLoading}
              codigoPostal={codigoPostal}
              onSearch={(q) => {
                setSearchQuery(q);
                handleAnalyzeSearch(q);
              }}
              onStartQuiz={handleStartQuiz}
              onNavigateSearch={handleStartSearch}
              onChangeCp={() => { setCpInput(codigoPostal); setCpError(''); setShowCpModal(true); }}
              onRoutineRestored={handleRoutineRestored}
              onRefreshDashboard={async () => {
                try {
                  const res = await fetch('/api/dermo/dashboard');
                  if (res.ok) {
                    const dd = await res.json();
                    setDashboardData(dd);
                  }
                } catch {}
              }}
              onShowPaywall={(view) => { setPaywallView(view); setShowAnonPaywall(true); }}
            />
          </div>
        );
      case 'home':
        return (
          <div style={{ height: '100%' }}>
            <DermoHomeScreen
              userType={userType}
              userEmail={userEmail}
              consultasConsumidas={consultasConsumidas}
              onStartSearch={handleStartSearch}
              onStartQuiz={handleStartQuiz}
            />
          </div>
        );
      case 'results':
        return (
          <div style={{ height: '100%' }}>
            <DermoResultsScreen
              results={searchResults}
              total={searchTotal}
              query={searchQuery}
              onBack={handleBack}
              onSelect={handleSelect}
              loading={loading}
              userType={userType}
            />
          </div>
        );
      case 'detail':
        return selectedProductId ? (
          <div style={{ height: '100%' }}>
            <DermoDetailScreen
              productId={selectedProductId}
              userType={userType}
              onBack={handleBack}
              onActivatePremium={() => setShowPaywall(true)}
              routineResult={routineResult}
            />
          </div>
        ) : null;
      case 'analyze':
        console.log("DATOS DEL PRODUCTO:", analyzeResult);
        return (
          <>
            <div style={{ height: '100%', padding: '1.25rem', background: colorVars.bg, color: colorVars.fg, margin: '0 auto' }}>
            {analyzeLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: colorVars.premiumLight, fontSize: 15 }}>
                Analizando ingredientes...
              </div>
            ) : analyzeError ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: colorVars.danger, fontSize: 15 }}>{analyzeError}</div>
            ) : analyzeResult ? (
              <>
                <button
                  onClick={handleBack}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', color: colorVars.fgMuted,
                    fontSize: 13, cursor: 'pointer', padding: '0.25rem 0',
                    marginBottom: '0.75rem', fontFamily: 'inherit',
                    transition: 'color 0.15s',
                  }}
                >
                  <ArrowLeft size={16} />
                  {userType === 'free' || userType === 'premium' ? 'Volver al panel' : 'Volver'}
                </button>

                {/* ── Title + Counters (full width) ── */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 0.25rem' }}>
                    {analyzeResult.productName}
                  </h2>
                  <p style={{ fontSize: 13, color: colorVars.fgMuted, margin: 0 }}>
                    {analyzeResult.total} ingredientes analizados
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Seguros', count: analyzeResult.safe, color: colorVars.success, bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Precaución', count: analyzeResult.caution, color: colorVars.warning, bg: 'rgba(245,158,11,0.1)' },
                    { label: 'Evitar', count: analyzeResult.avoid, color: colorVars.danger, bg: 'rgba(239,68,68,0.1)' },
                  ].map((item) => (
                    <div key={item.label} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: item.bg, textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.count}</div>
                      <div style={{ fontSize: 11, color: item.color, marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Fit Score + Recommendation (antes del grid) ── */}
                {analyzeResult.fit_score !== undefined && analyzeResult.fit_score !== null && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <FitScoreBadge score={analyzeResult.fit_score} />
                      {analyzeResult.recommendation && (
                        <div style={{
                          flex: 1, minWidth: 200, fontSize: 13, color: colorVars.fgMuted, lineHeight: 1.4,
                          padding: '0.5rem 0.75rem', borderRadius: 8,
                          background: analyzeResult.fit_score >= 70 ? 'rgba(16,185,129,0.08)' :
                                      analyzeResult.fit_score >= 40 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                        }}>
                          {analyzeResult.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Two-column grid ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  {/* ── LEFT COLUMN (ingredients) ── */}
                  <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    {userType === 'anonymous' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {analyzeResult.ingredients.slice(0, 1).map((ing, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '0.6rem 0.85rem', borderRadius: 10,
                              background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                            }}>
                              {ing.verdict === 'safe' && <CheckCircle size={16} color={colorVars.success} style={{ flexShrink: 0 }} />}
                              {ing.verdict === 'caution' && <AlertTriangle size={16} color={colorVars.warning} style={{ flexShrink: 0 }} />}
                              {ing.verdict === 'avoid' && <AlertCircle size={16} color={colorVars.danger} style={{ flexShrink: 0 }} />}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>{ing.name}</div>
                                <div style={{ fontSize: 11, color: colorVars.fgMuted }}>{ing.note}</div>
                              </div>
                            </div>
                          ))}
                          <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {analyzeResult.ingredients.slice(1, 5).map((ing, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '0.6rem 0.85rem', borderRadius: 10,
                                background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                              }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: colorVars.border, flexShrink: 0 }} />
                                <div style={{ flex: 1, height: 12, borderRadius: 6, background: colorVars.border }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{
                          marginTop: '1.25rem', padding: '1.25rem', borderRadius: 14, textAlign: 'center',
                          background: `linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))`,
                          border: `1px solid rgba(124,58,237,0.2)`,
                        }}>
                          <div style={{ fontSize: 24, marginBottom: '0.5rem' }}>🔒</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.4rem' }}>
                            Regístrate gratis para ver el desglose completo
                          </div>
                          <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5, marginBottom: '0.85rem' }}>
                            Comprueba alérgenos, ingredientes incompatibles y guarda este análisis en tu perfil.
                          </div>
                          <button
                            onClick={() => router.push('/login?mode=register')}
                            style={{
                              padding: '0.75rem 2rem', borderRadius: 12, border: 'none',
                              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'inherit', transition: 'opacity 0.15s',
                            }}
                          >
                            Crear Cuenta Gratis
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {analyzeResult.ingredients.map((ing, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '0.6rem 0.85rem', borderRadius: 10,
                            background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                          }}>
                            {ing.verdict === 'safe' && <CheckCircle size={16} color={colorVars.success} style={{ flexShrink: 0 }} />}
                            {ing.verdict === 'caution' && <AlertTriangle size={16} color={colorVars.warning} style={{ flexShrink: 0 }} />}
                            {ing.verdict === 'avoid' && <AlertCircle size={16} color={colorVars.danger} style={{ flexShrink: 0 }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg }}>{ing.name}</div>
                              <div style={{ fontSize: 11, color: colorVars.fgMuted }}>{ing.note}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── RIGHT COLUMN (photo, info, chat, pharmacy) ── */}
                  {(userType === 'free' || userType === 'premium') && (
                    <div style={{ flex: '0 1 350px', minWidth: 0 }}>
                      {/* Product photo — contenedor único */}
                      <div style={{
                        position: 'relative', width: '100%', height: 224,
                        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                        borderRadius: 14, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', overflow: 'hidden', padding: '1rem',
                        marginBottom: '1rem',
                      }}>
                        {(() => {
                          const imgUrl = analyzeResult.image_front_url || analyzeResult.image_url || null;
                          return (
                            <>
                              {imageLoading && !imgError && imgUrl && (
                                <div style={{
                                  position: 'absolute', inset: 0,
                                  background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.04))`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  borderRadius: 14, zIndex: 10,
                                  animation: 'pulse 1.5s ease-in-out infinite',
                                }}>
                                  <span style={{ fontSize: 12, color: colorVars.fgMuted }}>Cargando imagen...</span>
                                </div>
                              )}
                              {imgUrl && !imgError ? (
                                <img
                                  src={imgUrl}
                                  alt={analyzeResult.productName}
                                  onLoad={() => setImageLoading(false)}
                                  onError={() => { setImgError(true); setImageLoading(false); }}
                                  style={{
                                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                                    opacity: imageLoading && !imgError ? 0 : 1,
                                    transition: 'opacity 300ms',
                                  }}
                                />
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 40 }}>🧴</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fg, marginBottom: '0.25rem', textAlign: 'center' }}>
                        {analyzeResult.productName}
                      </div>
                      <div style={{ fontSize: 11, color: colorVars.fgMuted, textAlign: 'center', marginBottom: '0.75rem' }}>
                        {analyzeResult.total} ingredientes · {analyzeResult.safe + analyzeResult.caution + analyzeResult.avoid} componentes
                      </div>
                      {analyzeResult.image_ingredients_url && (
                        <button
                          onClick={() => setShowIngredientsModal(true)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '0.5rem 1rem', borderRadius: 10,
                            border: `1px solid ${colorVars.border}`, background: 'none',
                            color: colorVars.premiumLight, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'background 0.15s',
                          }}
                        >
                          Ver etiqueta original
                        </button>
                      )}

                      {/* Application info (visible to all) */}
                      <div style={{
                        padding: '1rem', borderRadius: 14, marginBottom: '1rem',
                        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: colorVars.fg, marginBottom: '0.5rem' }}>
                          Modo de aplicación
                        </div>
                        <div style={{ fontSize: 12, color: colorVars.fgMuted, lineHeight: 1.5 }}>
                          Aplicar sobre la piel limpia y seca. Evitar contacto con ojos y mucosas. Usar protección solar durante el día si el producto contiene ácidos o retinoides.
                        </div>
                      </div>

                      {/* AI Chat (blurred for free) */}
                      <div style={{
                        padding: '1rem', borderRadius: 14, marginBottom: '1rem',
                        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: colorVars.premiumGlow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 14 }}>🤖</span>
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg }}>Asistente IA</span>
                          {userType === 'free' && <span style={{ fontSize: 10, color: colorVars.premiumLight, fontWeight: 600, background: colorVars.premiumGlow, padding: '2px 8px', borderRadius: 6 }}>Premium</span>}
                        </div>

                        {userType === 'free' ? (
                          <>
                            <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }}>
                              <div style={{ height: 40, borderRadius: 10, background: colorVars.bg, marginBottom: '0.5rem' }} />
                              <div style={{ height: 60, borderRadius: 10, background: colorVars.bg }} />
                            </div>
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(24,24,27,0.55)', backdropFilter: 'blur(2px)',
                              borderRadius: 14, padding: '1.25rem', textAlign: 'center',
                            }}>
                              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>🔒</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                                Pásate a Premium
                              </div>
                              <div style={{ fontSize: 11, color: colorVars.fgMuted, lineHeight: 1.5, marginBottom: '0.85rem', maxWidth: 260 }}>
                                Chatea con la IA sobre este producto y desbloquea alertas de compatibilidad.
                              </div>
                              <button
                                onClick={() => setShowPaywall(true)}
                                style={{
                                  padding: '0.65rem 1.5rem', borderRadius: 10, border: 'none',
                                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >
                                Desbloquear Premium
                              </button>
                            </div>
                          </>
                        ) : (
                          <ChatConversation
                            productName={analyzeResult.productName}
                            userType={userType}
                            onActivatePremium={() => setShowPaywall(true)}
                          />
                        )}
                      </div>

                      {/* Pharmacy availability (blurred for free) */}
                      <div style={{
                        padding: '1rem', borderRadius: 14,
                        background: colorVars.surface, border: `1px solid ${colorVars.border}`,
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: colorVars.premiumGlow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MapPin size={16} color={colorVars.premiumLight} />
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg }}>Disponibilidad en Farmacias</span>
                          {userType === 'free' && <span style={{ fontSize: 10, color: colorVars.premiumLight, fontWeight: 600, background: colorVars.premiumGlow, padding: '2px 8px', borderRadius: 6 }}>Premium</span>}
                        </div>

                        {userType === 'free' ? (
                          <>
                            <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }}>
                              <div style={{ height: 40, borderRadius: 10, background: colorVars.bg, marginBottom: '0.5rem' }} />
                              <div style={{ height: 40, borderRadius: 10, background: colorVars.bg }} />
                            </div>
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(24,24,27,0.55)', backdropFilter: 'blur(2px)',
                              borderRadius: 14, padding: '1.25rem', textAlign: 'center',
                            }}>
                              <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>🔒</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                                Pásate a Premium
                              </div>
                              <div style={{ fontSize: 11, color: colorVars.fgMuted, lineHeight: 1.5, marginBottom: '0.85rem', maxWidth: 260 }}>
                                Encuentra este producto cerca de ti, comprueba stock y resérvalo online.
                              </div>
                              <button
                                onClick={() => setShowPaywall(true)}
                                style={{
                                  padding: '0.65rem 1.5rem', borderRadius: 10, border: 'none',
                                  background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
                                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                  fontFamily: 'inherit',
                                }}
                              >
                                Desbloquear Premium
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
          {/* ── Ingredients Lightbox Modal ── */}
          {showIngredientsModal && analyzeResult?.image_ingredients_url && (
            <div
              onClick={() => setShowIngredientsModal(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '2rem', cursor: 'pointer',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
                  borderRadius: 14, overflow: 'hidden',
                  background: colorVars.surface, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                <button
                  onClick={() => setShowIngredientsModal(false)}
                  style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 10,
                    width: 36, height: 36, borderRadius: '50%',
                    border: 'none', background: 'rgba(0,0,0,0.6)',
                    color: '#fff', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit',
                  }}
                >
                  <X size={18} />
                </button>
                <img
                  src={analyzeResult.image_ingredients_url}
                  alt={`Etiqueta de ${analyzeResult.productName}`}
                  style={{
                    width: '100%', maxHeight: '85vh', objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          )}
        </>
      );
      case 'quiz':
        return (
          <div style={{ height: '100%' }}>
            <DermoQuizScreen
              userType={userType}
              onBack={handleBack}
              onComplete={handleQuizComplete}
              onActivatePremium={() => setShowPaywall(true)}
            />
          </div>
        );
      case 'advancedQuiz':
        return (
          <div style={{ height: '100%' }}>
            <DermoAdvancedQuizScreen
              userType={userType}
              userEmail={userEmail}
              onBack={() => {
                setView('dashboard');
                setRoutineResult(null);
              }}
              onComplete={handleQuizComplete}
            />
          </div>
        );
      case 'routine':
        return routineResult ? (
          <div style={{ height: '100%' }}>
            {renderRoutineView()}
          </div>
        ) : null;
      default:
        return (
          <div style={{ height: '100%' }}>
            <DermoSearchScreen
              onSearch={handleSearch}
              onAnalyze={handleAnalyzeSearch}
              loading={loading}
              userType={userType}
              onStartQuiz={handleStartQuiz}
              consultasConsumidas={consultasConsumidas}
            />
          </div>
        );
    }
  }

  function renderRoutineView() {
    if (!routineResult) return null;
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '1rem', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <button onClick={handleBack} style={dermoStyles.backBtn} aria-label="Volver">
            <X size={18} />
          </button>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: colorVars.fg, margin: 0, flex: 1 }}>
            Tu rutina personalizada
          </h2>
        </div>

        <div style={{ background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.premiumLight, marginBottom: '0.75rem' }}>
            ☀️ Rutina AM
          </div>
          {routineResult.am_routine?.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: i < (routineResult.am_routine?.length ?? 0) - 1 ? `1px solid ${colorVars.border}` : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(167,139,250,0.15)', color: colorVars.premiumLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{step.order}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colorVars.fg, wordBreak: 'break-word' }}>{step.productName}</div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted }}>{step.step}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#60A5FA', marginBottom: '0.75rem' }}>
            🌙 Rutina PM
          </div>
          {routineResult.pm_routine?.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: i < (routineResult.pm_routine?.length ?? 0) - 1 ? `1px solid ${colorVars.border}` : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(96,165,250,0.15)', color: '#60A5FA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              }}>{step.order}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: colorVars.fg, wordBreak: 'break-word' }}>{step.productName}</div>
                <div style={{ fontSize: 12, color: colorVars.fgMuted }}>{step.step}</div>
              </div>
            </div>
          ))}
        </div>

        {routineResult.explanation && (
          <div style={{ background: colorVars.surface, borderRadius: 14, border: `1px solid ${colorVars.border}`, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: colorVars.fg, marginBottom: '0.75rem' }}>
              ¿Por qué esta rutina?
            </div>
            <div style={{ fontSize: 14, color: colorVars.fgMuted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {routineResult.explanation}
            </div>
          </div>
        )}

        {/* ── Nombre editable ── */}
        <div style={{
          background: colorVars.surface, borderRadius: 14,
          border: `1px solid ${colorVars.border}`, padding: '1.25rem',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colorVars.fgMuted, marginBottom: '0.5rem' }}>
            Nombre de tu rutina
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              value={routineName}
              onChange={e => setRoutineName(e.target.value)}
              placeholder="Ej: Rutina antiedad — grasa"
              style={{
                flex: 1, padding: '0.6rem 0.75rem', borderRadius: 8,
                border: `1px solid ${colorVars.border}`,
                background: colorVars.bg, color: colorVars.fg,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Aceptar y Activar Rutina ── */}
        <div style={{
          background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.04))`,
          borderRadius: 14, border: `1px solid rgba(124,58,237,0.25)`,
          padding: '1.25rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.5 }}>
            Esta rutina se ha generado según tu tipo de piel y objetivos. Al activarla, empezarás a hacer seguimiento diario desde tu panel.
          </p>
          <button
            onClick={handleActivateRoutine}
            disabled={routineActivating}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.75rem 2rem', borderRadius: 12, border: 'none',
              background: routineActivating
                ? colorVars.surfaceHover
                : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: routineActivating ? 'not-allowed' : 'pointer',
              opacity: routineActivating ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {routineActivating ? (
              <><Loader2 size={18} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Activando...</>
            ) : (
              <><CheckCircle size={18} /> Aceptar y Activar Rutina</>
            )}
          </button>
        </div>
      </div>
    );
  }

  function renderPaywallModal() {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', flexDirection: 'column',
        animation: 'dermoFadeIn 0.2s ease-out',
      }}>
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowPaywall(false)}
        />
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPaywall(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${colorVars.border}`,
              background: colorVars.surface,
              color: colorVars.fg, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PremiumUpgradeScreen onActivatePremium={handleActivatePremium} email={userEmail} />
          </div>
        </div>
      </div>
    );
  }

  function renderCpModal() {
    if (!showCpModal) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 75,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        animation: 'dermoFadeIn 0.2s ease-out',
      }} onClick={() => setShowCpModal(false)}>
        <div style={{
          background: colorVars.surface, borderRadius: 16,
          border: `1px solid ${colorVars.border}`,
          padding: '1.5rem', maxWidth: 360, width: '90%', textAlign: 'center',
        }} onClick={e => e.stopPropagation()}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: colorVars.premiumGlow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <MapPin size={24} color={colorVars.premiumLight} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: '0 0 0.35rem' }}>
            Mi código postal
          </h3>
          <p style={{ fontSize: 13, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.4 }}>
            Indica tu código postal para ver disponibilidad en farmacias cercanas.
          </p>
          <input
            value={cpInput}
            onChange={e => setCpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
            placeholder="28001"
            maxLength={5}
            aria-label="Código postal"
            style={{
              width: '100%', background: colorVars.bg, border: `1px solid ${colorVars.border}`,
              borderRadius: 10, color: colorVars.fg, fontSize: 16, fontWeight: 700,
              padding: '0.75rem', outline: 'none', fontFamily: 'inherit',
              textAlign: 'center', letterSpacing: '0.3em', boxSizing: 'border-box',
            }}
            autoFocus
          />
          {cpError && (
            <div style={{ color: colorVars.danger, fontSize: 13, marginTop: '0.5rem' }}>{cpError}</div>
          )}
          <button
            onClick={handleCpChange}
            disabled={cpBusy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.75rem 1.25rem', borderRadius: 10, border: 'none',
              background: cpBusy ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: cpBusy ? 'not-allowed' : 'pointer',
              marginTop: '1rem', fontFamily: 'inherit',
            }}
          >
            {cpBusy ? (
              <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Guardando...</>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    );
  }

  function renderGoogleModal() {
    const isGooglePending = typeof window !== 'undefined' && new URL(window.location.href).searchParams.has('google_pending');
    if (!isGooglePending) return null;

    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        animation: 'dermoFadeIn 0.2s ease-out',
      }}>
        <div style={{
          background: colorVars.surface, borderRadius: 16,
          border: `1px solid ${colorVars.border}`,
          padding: '1.5rem', maxWidth: 360, width: '90%', textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: colorVars.premiumGlow,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <MapPin size={24} color={colorVars.premiumLight} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: colorVars.fg, margin: '0 0 0.35rem' }}>
            Un último paso
          </h3>
          <p style={{ fontSize: 13, color: colorVars.fgMuted, margin: '0 0 1rem', lineHeight: 1.4 }}>
            Introduce tu código postal para ver disponibilidad en farmacias cercanas.
          </p>
          <input
            value={googleCp}
            onChange={e => setGoogleCp(e.target.value)}
            placeholder="28001"
            maxLength={5}
            aria-label="Código postal"
            style={{
              width: '100%', background: colorVars.bg, border: `1px solid ${colorVars.border}`,
              borderRadius: 10, color: colorVars.fg, fontSize: 16, fontWeight: 700,
              padding: '0.75rem', outline: 'none', fontFamily: 'inherit',
              textAlign: 'center', letterSpacing: '0.3em', boxSizing: 'border-box',
            }}
            autoFocus
          />
          {googleError && (
            <div style={{ color: colorVars.danger, fontSize: 13, marginTop: '0.5rem' }}>{googleError}</div>
          )}
          <button
            onClick={handleGoogleCpSubmit}
            disabled={googleBusy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', padding: '0.75rem 1.25rem', borderRadius: 10, border: 'none',
              background: googleBusy ? colorVars.surfaceHover : `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: googleBusy ? 'not-allowed' : 'pointer',
              marginTop: '1rem', fontFamily: 'inherit',
            }}
          >
            {googleBusy ? (
              <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Guardando...</>
            ) : (
              'Continuar al Dashboard'
            )}
          </button>
        </div>
      </div>
    );
  }
}

function PremiumUpgradeScreen({ onActivatePremium, email }: { onActivatePremium: () => void; email: string }) {
  const [busy, setBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const handleActivate = async () => {
    setBusy(true);
    setUpgradeError('');
    try {
      const res = await fetch('/api/dermo/premium/activate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      onActivatePremium();
    } catch (err: any) {
      setUpgradeError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: colorVars.bg, color: colorVars.fg, padding: '2rem 1rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%',
    }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.08))`,
            border: `1px solid rgba(124,58,237,0.2)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <Crown size={28} color={colorVars.premiumLight} />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 0.35rem', lineHeight: 1.2 }}>
            Dermofarmacia <span style={{ color: colorVars.premiumLight }}>Premium</span>
          </h1>
          <p style={{ fontSize: 14, color: colorVars.fgMuted, margin: 0 }}>
            Desbloquea el análisis completo de ingredientes, la consulta IA ilimitada y las rutinas personalizadas.
          </p>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${colorVars.premiumGlow}, rgba(167,139,250,0.06))`,
          border: `1px solid rgba(124,58,237,0.25)`,
          borderRadius: 16, padding: '1.5rem',
          textAlign: 'center', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: 14, color: colorVars.fgMuted, marginBottom: '0.75rem' }}>
            Has iniciado sesión como <strong style={{ color: colorVars.fg }}>{email}</strong>
          </div>
          <button
            onClick={handleActivate}
            disabled={busy}
            aria-label="Activar Premium por 5€/mes"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              width: '100%', padding: '0.75rem 1.25rem', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${colorVars.premium}, ${colorVars.premiumLight})`,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1, fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            {busy ? (
              <><Loader2 size={16} style={{ animation: 'dermoSpin 0.8s linear infinite' }} /> Activando...</>
            ) : (
              <><Crown size={16} /> Activar Premium — 5€/mes</>
            )}
          </button>
          {upgradeError && <div style={{ color: colorVars.danger, fontSize: 13, marginTop: '0.75rem' }}>{upgradeError}</div>}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <p style={{ fontSize: 12, color: colorVars.fgDim, margin: 0 }}>
            Pago seguro • Sin permanencia • Cancela en 1 clic
          </p>
        </div>
      </div>
    </div>
  );
}
