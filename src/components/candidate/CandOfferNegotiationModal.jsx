import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useApp } from '../../context/AppContext';

export default function CandOfferNegotiationModal({ candId, jobId, onClose }) {
  const { showToast } = useApp();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [counterMode, setCounterMode] = useState(false);
  const [counterData, setCounterData] = useState({
    base: 0,
    equity: 0,
    bonus: 0,
    message: ''
  });

  const offerId = `${candId}_${jobId}`;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'offers', offerId), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setOffer(data);
        setCounterData({
          base: data.base || 0,
          equity: data.equity || 0,
          bonus: data.bonus || 0,
          message: ''
        });
      }
      setLoading(false);
    }, err => {
      console.error('CandOfferNegotiationModal: offer snapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, [offerId]);

  async function handleAccept() {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'applications', offerId), {
        stage: 'Hired',
        updatedAt: serverTimestamp()
      });
      showToast('Congratulations! You have accepted the offer.', 'success');
      onClose();
    } catch (err) {
      console.error('Error accepting offer:', err);
      showToast('Failed to accept offer', 'error');
    }
  }

  async function handleDecline() {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'declined',
        updatedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'applications', offerId), {
        stage: 'Declined',
        updatedAt: serverTimestamp()
      });
      showToast('Offer declined', 'info');
      onClose();
    } catch (err) {
      console.error('Error declining offer:', err);
      showToast('Failed to decline offer', 'error');
    }
  }

  async function handleSendCounter() {
    if (!counterData.message.trim()) {
      showToast('Please provide a message for your counter offer', 'error');
      return;
    }

    try {
      const historyItem = {
        type: 'candidate_counter',
        base: counterData.base,
        equity: counterData.equity,
        bonus: counterData.bonus,
        message: counterData.message,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'offers', offerId), {
        status: 'countered_by_candidate',
        base: counterData.base,
        equity: counterData.equity,
        bonus: counterData.bonus,
        history: [...(offer.history || []), historyItem],
        updatedAt: serverTimestamp()
      });

      showToast('Counter offer sent', 'success');
      setCounterMode(false);
    } catch (err) {
      console.error('Error sending counter:', err);
      showToast('Failed to send counter offer', 'error');
    }
  }

  if (loading) return null;
  if (!offer) return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ padding: 24, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text3)' }}>Offer details not found.</div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );

  const isPending = offer.status === 'sent' || offer.status === 'countered_by_employer';
  const isAccepted = offer.status === 'accepted';
  const isDeclined = offer.status === 'declined';
  const isCountered = offer.status === 'countered_by_candidate';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Offer Review — {offer.jobTitle || 'Role'}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {isAccepted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)', marginBottom: 8 }}>Offer Accepted!</div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>You&apos;ve joined the team at {offer.companyName}. Check your email for onboarding next steps.</div>
            </div>
          ) : isDeclined ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>Offer Declined</div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>You have declined this offer. We wish you the best in your search!</div>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(108,71,255,0.05)', border: '1px solid rgba(108,71,255,0.15)', borderRadius: 'var(--r)', padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Current Offer Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Base Salary</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>£{offer.base?.toLocaleString()}k</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Equity</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{offer.equity}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Annual Bonus</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{offer.bonus}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Start Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{offer.startDate || 'TBC'}</div>
                  </div>
                </div>
              </div>

              {isCountered && (
                <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 'var(--r)', padding: 12, marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>Awaiting employer response to your counter offer.</div>
                </div>
              )}

              {counterMode ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Propose Counter Offer</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Base Salary (£k)</label>
                      <input type="number" className="inp" value={counterData.base} onChange={e => setCounterData({ ...counterData, base: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Equity (%)</label>
                      <input type="number" step="0.1" className="inp" value={counterData.equity} onChange={e => setCounterData({ ...counterData, equity: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Message to Hiring Manager</label>
                    <textarea className="inp" style={{ height: 80, resize: 'none' }} placeholder="Explain your reasoning..." value={counterData.message} onChange={e => setCounterData({ ...counterData, message: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setCounterMode(false)}>Cancel</button>
                    <button className="btn btn-violet btn-sm" style={{ flex: 1 }} onClick={handleSendCounter}>Send Counter →</button>
                  </div>
                </div>
              ) : !isCountered && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button className="btn btn-violet" style={{ flex: 2, height: 44 }} onClick={handleAccept}>Accept Offer</button>
                  <button className="btn btn-ghost" style={{ flex: 1, height: 44 }} onClick={() => setCounterMode(true)}>Counter</button>
                  <button className="btn btn-ghost" style={{ flex: 1, height: 44, color: 'var(--red)' }} onClick={handleDecline}>Decline</button>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>Negotiation History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(offer.history || []).slice().reverse().map((h, i) => (
                  <div key={i} style={{ padding: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: h.type.includes('employer') ? '#a78bfa' : 'var(--teal)' }}>
                        {h.type === 'initial' ? 'Initial Offer' : h.type === 'employer_counter' ? 'Employer Counter' : 'Your Counter'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(h.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      £{h.base}k · {h.equity}% equity · {h.bonus}% bonus
                    </div>
                    {h.message && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>&quot;{h.message}&quot;</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
