import React from 'react';
import { sampleSummaryData } from '../data/sampleData';

const SummaryTab: React.FC = () => {
  return (
    <div className="tab-content active">
      <div className="summary-box">
        <h3>📊 Ringkasan Meeting</h3>
        <p>{sampleSummaryData.meetingSummary}</p>
      </div>
      
      <div className="summary-box">
        <h3>✅ Action Items</h3>
        <ul>
          {sampleSummaryData.actionItems.map((item, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      </div>

      <div className="summary-box">
        <h3>🎯 Key Decisions</h3>
        <ul>
          {sampleSummaryData.keyDecisions.map((decision, index) => (
            <li key={index}>{decision}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SummaryTab;
