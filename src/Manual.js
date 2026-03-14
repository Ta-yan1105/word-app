import React from 'react';

const Manual = ({ t, setView }) => {
  return (
    <div className="app-container gentle-bg desk-view">
      <div className="manual-container">
        <div className="study-controls-top no-print" style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '20px', position: 'sticky', top: '10px', zIndex: 100 }}>
           <button className="back-to-desk-btn" onClick={() => setView('boxes')} style={{background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '10px 20px', borderRadius: '8px'}}>{t.backToHome}</button>
           <button className="add-btn" onClick={() => window.print()} style={{marginLeft: '15px', backgroundColor: '#e74c3c'}}>{t.printPdfBtn}</button>
        </div>
        <div className="manual-content print-area">
            <h1 className="manual-title">{t.appTitle}<br/>{t.m_h1}</h1>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s1}</h2><p className="manual-p">{t.m_p1}</p><ul className="manual-list"><li>{t.m_l1_1}</li><li>{t.m_l1_2}</li><li>{t.m_l1_3}</li></ul></div>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s2}</h2><p className="manual-p">{t.m_p2}</p><h3 className="manual-h3">{t.m_s2_1}</h3><p className="manual-p">{t.m_p2_1}</p><h3 className="manual-h3">{t.m_s2_2}</h3><p className="manual-p">{t.m_p2_2}</p><p className="manual-p" style={{background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#555'}}>{t.m_p2_3}</p></div>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s3}</h2><p className="manual-p">{t.m_p3}</p><ul className="manual-list"><li>{t.m_l3_1}</li><li>{t.m_l3_2}</li><li>{t.m_l3_3}</li><li>{t.m_l3_4}</li></ul></div>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s4}</h2><p className="manual-p">{t.m_p4}</p><ul className="manual-list"><li>{t.m_l4_1}</li><li>{t.m_l4_2}</li><li>{t.m_l4_3}</li></ul></div>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s5}</h2><p className="manual-p">{t.m_p5}</p><p className="manual-p">{t.m_p5_1}</p></div>
            <div className="manual-section"><h2 className="manual-h2">{t.m_s6}</h2><ul className="manual-list"><li>{t.m_l6_1}</li><li>{t.m_l6_2}</li><li>{t.m_l6_3}</li></ul></div>
            <div style={{marginTop: '50px', textAlign: 'center', color: '#95a5a6', fontSize: '12px'}}>{t.appTitle}</div>
        </div>
      </div>
    </div>
  );
};

export default Manual;