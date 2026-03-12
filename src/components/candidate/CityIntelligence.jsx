import { useState, useEffect } from 'react';
import { Type } from "@google/genai";
import { getGeminiClient } from '../../services/geminiService';
import { useAuth } from '../../context/AuthContext';

export default function CityIntelligence({ toCity }) {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fromCity = profile?.location || 'London, UK';

  useEffect(() => {
    if (!toCity || toCity === 'Remote' || toCity === fromCity) { setData(null); return; }

    async function fetchComparison() {
      setLoading(true);
      setError(null);
      try {
        const ai = getGeminiClient();
        if (!ai) { setData(null); setLoading(false); return; }

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Compare cost of living between "${fromCity}" and "${toCity}". Return ONLY a JSON object with: jobCity {name, countryCode, currencySymbol, rent, food, transport, tax}, userCity {name, countryCode, currencySymbol, rent, food, transport, tax}, ppp {jobSalary: 100000, userEquivalent: number}. Use realistic monthly averages for a single professional.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                jobCity:  { type: Type.OBJECT, properties: { name:{type:Type.STRING}, countryCode:{type:Type.STRING}, currencySymbol:{type:Type.STRING}, rent:{type:Type.NUMBER}, food:{type:Type.NUMBER}, transport:{type:Type.NUMBER}, tax:{type:Type.NUMBER} }, required: ["name", "countryCode", "currencySymbol", "rent", "food", "transport", "tax"] },
                userCity: { type: Type.OBJECT, properties: { name:{type:Type.STRING}, countryCode:{type:Type.STRING}, currencySymbol:{type:Type.STRING}, rent:{type:Type.NUMBER}, food:{type:Type.NUMBER}, transport:{type:Type.NUMBER}, tax:{type:Type.NUMBER} }, required: ["name", "countryCode", "currencySymbol", "rent", "food", "transport", "tax"] },
                ppp:      { type: Type.OBJECT, properties: { jobSalary:{type:Type.NUMBER}, userEquivalent:{type:Type.NUMBER} }, required: ["jobSalary", "userEquivalent"] },
              },
              required: ["jobCity", "userCity", "ppp"]
            },
          },
        });

        let text = response.text;
        // Clean up markdown if present
        if (text.includes('```')) {
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        
        try {
          const parsed = JSON.parse(text);
          setData(parsed);
        } catch (parseErr) {
          console.error('CityIntelligence JSON Parse Error. Text:', text);
          throw parseErr;
        }
      } catch (err) {
        console.error('CityIntelligence error:', err);
        setError('Could not load city comparison');
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [toCity, fromCity]);

  if (!toCity || toCity === 'Remote' || toCity === fromCity) return null;
  if (loading) return (
    <div style={{ padding:'10px 12px', borderRadius:'var(--r)', background:'rgba(56,189,248,.05)', border:'1px solid rgba(56,189,248,.12)', fontSize:12, color:'var(--text3)' }}>
      🌍 Loading city comparison…
    </div>
  );
  if (error || !data) return null;

  const diff = data.ppp ? Math.round(((data.ppp.userEquivalent - data.ppp.jobSalary) / data.ppp.jobSalary) * 100) : 0;
  const diffColor = diff > 0 ? 'var(--green)' : diff < -10 ? 'var(--red)' : 'var(--amber)';

  return (
    <div style={{ borderRadius:'var(--r)', background:'rgba(56,189,248,.04)', border:'1px solid rgba(56,189,248,.12)', overflow:'hidden' }}>
      <div
        style={{ padding:'9px 12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}
        onClick={() => setIsExpanded(p => !p)}
      >
        <div style={{ fontSize:12, fontWeight:600 }}>🌍 City intelligence: {data.userCity?.name} → {data.jobCity?.name}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:diffColor }}>
            {diff > 0 ? `+${diff}%` : `${diff}%`} purchasing power
          </span>
          <span style={{ fontSize:10, color:'var(--text3)' }}>{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {isExpanded && (
        <div style={{ padding:'0 12px 12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {['jobCity','userCity'].map(key => {
            const c = data[key];
            if (!c) return null;
            return (
              <div key={key} style={{ background:'rgba(255,255,255,.03)', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', marginBottom:6 }}>{c.countryCode} {c.name}</div>
                {[['Rent',c.rent],['Food',c.food],['Transport',c.transport],['Tax rate',c.tax+'%']].map(([lbl,val]) => (
                  <div key={lbl} style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ color:'var(--text3)' }}>{lbl}</span>
                    <span style={{ fontWeight:600 }}>{typeof val === 'number' && lbl !== 'Tax rate' ? `${c.currencySymbol}${val?.toLocaleString()}` : val}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {data.ppp && (
            <div style={{ gridColumn:'1/-1', padding:'8px 10px', borderRadius:8, background:`${diffColor}10`, border:`1px solid ${diffColor}25`, fontSize:12 }}>
              <span style={{ color:'var(--text3)' }}>£100k in {data.jobCity?.name} ≈ </span>
              <span style={{ fontWeight:700, color:diffColor }}>£{data.ppp.userEquivalent?.toLocaleString()}</span>
              <span style={{ color:'var(--text3)' }}> purchasing power in {data.userCity?.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
