import React from 'react';

export const parseCSV = (text) => {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let currentVal = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i+1];
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentVal);
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentVal);
        rows.push(row);
        row = [];
        currentVal = '';
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentVal += char;
      }
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    rows.push(row);
  }
  return rows;
};

export const chunkArray = (array, size) => {
  const chunked = [];
  if (!Array.isArray(array)) return chunked;
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
};

export const cleanText = (text) => {
  if (!text) return '';
  return String(text).replace(/[\r\n]+/g, '').trim();
};

export const cleanTranslation = (text) => {
  if (!text) return '';
  return cleanText(text).split(/\*\*(.*?)\*\*/g).join('');
};

export const renderBlankExample = (text) => {
  if (!text) return <span className="print-blank-line"></span>;
  const cleanedText = cleanText(text);
  if (!cleanedText.includes('**')) return <>{cleanedText} <span className="print-blank-line"></span></>;
  
  const parts = cleanedText.split(/\*\*(.*?)\*\*/g);
  const elements = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      const blank = <span key={`blank-${i}`} className="print-blank-line"></span>;
      if (i + 1 < parts.length && /^[.,!?;:]/.test(parts[i + 1])) {
        const match = parts[i + 1].match(/^[.,!?;:]+/);
        const punc = match[0];
        const rest = parts[i + 1].substring(punc.length);
        elements.push(
          <span key={`group-${i}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {blank}<span>{punc}</span>
          </span>
        );
        parts[i + 1] = rest;
      } else {
        elements.push(blank);
      }
    } else {
      if (parts[i]) {
        elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
    }
  }
  return <>{elements}</>;
};

export const renderHighlightedText = (text) => {
  if (!text) return null;
  try {
    const parts = String(text).split(/\*\*(.*?)\*\*/g);
    const elements = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        const highlight = <span key={`highlight-${i}`} className="highlight-word">{parts[i]}</span>;
        if (i + 1 < parts.length && /^[.,!?;:]/.test(parts[i + 1])) {
          const match = parts[i + 1].match(/^[.,!?;:]+/);
          const punc = match[0];
          const rest = parts[i + 1].substring(punc.length);
          elements.push(
            <span key={`group-${i}`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {highlight}<span>{punc}</span>
            </span>
          );
          parts[i + 1] = rest;
        } else {
          elements.push(highlight);
        }
      } else {
        if (parts[i]) {
          elements.push(<span key={`text-${i}`}>{parts[i]}</span>);
        }
      }
    }
    return <>{elements}</>;
  } catch(e) {
    return String(text);
  }
};