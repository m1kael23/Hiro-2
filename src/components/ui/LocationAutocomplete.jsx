import { useState, useEffect, useRef } from 'react';
import { Type } from "@google/genai";
import { getGeminiClient } from '../../services/geminiService';

export default function LocationAutocomplete({ value, onChange, placeholder = "City, Country" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => { setInputValue(value || ''); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (input) => {
    if (!input || input.length < 3) { setSuggestions([]); return; }
    setLoading(true);
    try {
      const ai = getGeminiClient();
      if (!ai) { setLoading(false); return; }
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Find 5 real cities that match: "${input}". Return JSON array with objects: {city, country, full (format: "City, Country")}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                city:    { type: Type.STRING },
                country: { type: Type.STRING },
                full:    { type: Type.STRING },
              },
            },
          },
        },
      });
      const cities = JSON.parse(response.text);
      setSuggestions(Array.isArray(cities) ? cities : []);
      setShowDropdown(true);
    } catch (err) {
      console.error('LocationAutocomplete error:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSelect = (city) => {
    setInputValue(city.full);
    onChange(city.full);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 'var(--r)',
          background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)',
          color: 'var(--text)', fontSize: 13, fontFamily: 'Inter', boxSizing: 'border-box', outline: 'none',
        }}
      />
      {loading && (
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text3)' }}>…</div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, marginTop: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)',
          boxShadow: '0 8px 24px rgba(0,0,0,.4)', overflow: 'hidden',
        }}>
          {suggestions.map((city, i) => (
            <div
              key={i}
              onClick={() => handleSelect(city)}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600 }}>{city.city}</span>
              <span style={{ color: 'var(--text3)', marginLeft: 6 }}>{city.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
