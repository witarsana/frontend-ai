import React from 'react';

interface SummaryTabProps {
  summaryData?: {
    summary?: string;
    action_items?: string[];
    key_decisions?: string[];
  } | null;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ summaryData }) => {
  // Default/placeholder data when no API data is available
  const defaultData = {
    summary: "Upload audio file untuk melihat ringkasan AI meeting di sini...",
    action_items: ["Upload file audio untuk melihat action items"],
    key_decisions: ["Upload file audio untuk melihat key decisions"]
  };

  const data = summaryData || defaultData;

  return (
    <div className="tab-content active">
      <div className="summary-box">
        <h3>📊 Ringkasan Meeting</h3>
        <p>{data.summary || defaultData.summary}</p>
      </div>
      
      <div className="summary-box">
        <h3>✅ Action Items</h3>
        <ul>
          {(data.action_items || defaultData.action_items).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="summary-box">
        <h3>🎯 Key Decisions</h3>
        <ul>
          {(data.key_decisions || defaultData.key_decisions).map((decision, index) => (
            <li key={index}>{decision}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SummaryTab;
