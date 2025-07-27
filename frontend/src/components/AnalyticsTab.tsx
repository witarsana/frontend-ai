import React from 'react';

const AnalyticsTab: React.FC = () => {
  return (
    <div className="tab-content">
      <div className="summary-box">
        <h3>🎤 Speaker Statistics</h3>
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>
              <span className="speaker-avatar speaker-1" style={{ width: '20px', height: '20px', fontSize: '0.8rem', marginRight: '10px' }}>
                1
              </span>
              John (Project Manager)
            </span>
            <span><strong>45% (18 min)</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>
              <span className="speaker-avatar speaker-2" style={{ width: '20px', height: '20px', fontSize: '0.8rem', marginRight: '10px' }}>
                2
              </span>
              Sarah (Developer)
            </span>
            <span><strong>35% (14 min)</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              <span className="speaker-avatar speaker-3" style={{ width: '20px', height: '20px', fontSize: '0.8rem', marginRight: '10px' }}>
                3
              </span>
              Mike (QA Lead)
            </span>
            <span><strong>20% (8 min)</strong></span>
          </div>
        </div>
      </div>

      <div className="summary-box">
        <h3>📈 Meeting Insights</h3>
        <ul>
          <li><strong>Total Duration:</strong> 40 minutes</li>
          <li><strong>Action Items Generated:</strong> 8</li>
          <li><strong>Decisions Made:</strong> 5</li>
          <li><strong>Questions Raised:</strong> 12</li>
          <li><strong>Most Active Speaker:</strong> John (45% talk time)</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsTab;
