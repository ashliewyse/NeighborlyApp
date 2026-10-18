import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BusinessProfileView } from '../../src/app/App';
import { calls } from './supabase';
import '../../src/styles/index.css';

const business = {
  id: 1, name: 'Crop Test Business', category: 'Services', city: 'Test City',
  rating: 0, reviewCount: 0, badges: [], description: 'Local crop regression check',
  services: [], photos: [], phone: '', email: '', website: '', address: '',
  hours: [], founded: '', owner: 'Test Owner', reviews: [],
};

// Make the asynchronous canvas boundary slow enough to exercise Cancel while applying.
let delayEncoding = false;
const nativeToBlob = HTMLCanvasElement.prototype.toBlob;
HTMLCanvasElement.prototype.toBlob = function(callback, ...options) {
  const delayed = delayEncoding;
  nativeToBlob.call(this, blob => {
    if (delayed) setTimeout(() => callback(blob), 1500);
    else callback(blob);
  }, ...options);
};

function Harness() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh(value => value + 1);
    window.addEventListener('qa-backend', update);
    return () => window.removeEventListener('qa-backend', update);
  }, []);
  return <>
    <label><input type="checkbox" onChange={event => { delayEncoding = event.target.checked; }} />Delay crop processing</label>
    <pre aria-label="Backend calls" style={{ padding: 12, background: '#e0f2fe', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(calls)}
    </pre>
    <BusinessProfileView biz={business} isOwnProfile={!location.search.includes('visitor')}
      onBack={() => {}} onUserClick={() => {}} />
  </>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
