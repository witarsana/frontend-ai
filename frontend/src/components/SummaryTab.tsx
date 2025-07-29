import React, { useState } from 'react';
import { aiAPI } from '../services/api';

interface SummaryTabProps {
  summaryData: any;
  jobId: string | undefined;
  onSummaryRegenerated: (newSummaryData: any) => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ summaryData, jobId, onSummaryRegenerated }) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localSummary, setLocalSummary] = useState<string | null>(null);

  // Debug render cycles
  console.log('🎯 SummaryTab RENDER:', {
    timestamp: new Date().toISOString(),
    jobId,
    hasSummaryData: !!summaryData,
    summaryDataType: typeof summaryData,
    summaryDataSummary: summaryData?.summary?.substring(0, 50) + '...',
    hasLocalSummary: !!localSummary,
    localSummaryLength: localSummary?.length || 0,
    localSummaryPreview: localSummary?.substring(0, 50) + '...',
    isRegenerating
  });

  const handleRegenerateSummary = async () => {
    console.log('🔄 Regenerate button clicked, jobId:', jobId);
    
    if (!jobId) {
      console.error('❌ No job ID available');
      alert('No job ID available for regeneration');
      return;
    }

    console.log('🚀 Starting regeneration for job:', jobId);
    setIsRegenerating(true);
    
    try {
      // Use API service for regeneration
      console.log('📡 Calling aiAPI.regenerateSummary...');
      const regenerateResult = await aiAPI.regenerateSummary(jobId);
      console.log('✅ Summary regenerated successfully:', regenerateResult);
      
      // Now fetch the full updated data
      console.log('📡 Fetching updated full data...');
      const fullData = await aiAPI.getResult(jobId);
      console.log('✅ Full updated data received:', fullData);
      console.log('📝 Updated summary from API:', fullData?.summary);
      
      // Force immediate display by setting local summary
      console.log('🔄 Setting local summary for immediate display');
      console.log('📊 About to set localSummary with:', {
        summaryExists: !!fullData?.summary,
        summaryType: typeof fullData?.summary,
        summaryLength: fullData?.summary?.length || 0,
        summaryFirstChars: fullData?.summary?.substring(0, 100) || 'NO_CONTENT'
      });
      setLocalSummary(fullData?.summary || null);
      console.log('✅ LocalSummary has been set, triggering re-render');
      
      // Trigger callback to refresh data with full result
      console.log('🔄 Calling onSummaryRegenerated callback with full data');
      onSummaryRegenerated(fullData);
      
      alert('Summary berhasil di-generate ulang!');
    } catch (error) {
      console.error('❌ Error regenerating summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error regenerating summary: ${errorMessage}`);
    } finally {
      setIsRegenerating(false);
      console.log('✅ Regeneration process finished');
    }
  };

  // Parse summary content into structured sections
  const parseSummaryContent = (text: string) => {
    if (!text || text.length < 10) {
      return { hasContent: false, sections: [] };
    }

    // Check if we have structured data to avoid duplication
    const hasStructuredActionItems = summaryData?.action_items && summaryData.action_items.length > 0;
    const hasStructuredKeyDecisions = summaryData?.key_decisions && summaryData.key_decisions.length > 0;

    // If we have structured data, clean the summary text first
    let cleanedText = text;
    
    if (hasStructuredActionItems || hasStructuredKeyDecisions) {
      // Remove ACTION ITEMS and KEPUTUSAN sections completely from text
      const lines = text.split('\n');
      const filteredLines: string[] = [];
      let skipSection = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this line starts a section we want to skip
        if (trimmedLine.toLowerCase().includes('action items') || 
            trimmedLine.toLowerCase().includes('keputusan')) {
          skipSection = true;
          continue;
        }
        
        // Check if we're starting a new section (reset skip) - support both formats
        if ((trimmedLine.startsWith('#### ') || 
             (trimmedLine.startsWith('**') && trimmedLine.endsWith('**'))) && 
            !trimmedLine.toLowerCase().includes('action items') && 
            !trimmedLine.toLowerCase().includes('keputusan')) {
          skipSection = false;
        }
        
        // Only add lines if we're not skipping
        if (!skipSection) {
          filteredLines.push(line);
        }
      }
      
      cleanedText = filteredLines.join('\n');
    }

    const lines = cleanedText.split('\n');
    const sections: Array<{ title: string; content: string; icon: string }> = [];
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length === 0) {
        continue;
      }
      
      // Skip only the main title (###)
      if (trimmedLine.startsWith('### ') || 
          trimmedLine.startsWith('===') || trimmedLine.startsWith('---')) {
        continue;
      }

      // Detect section headers - support both #### and ** formats
      if ((trimmedLine.startsWith('#### ') && !trimmedLine.toLowerCase().includes('action items') && !trimmedLine.toLowerCase().includes('keputusan')) ||
          (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && 
           !trimmedLine.toLowerCase().includes('action items') && 
           !trimmedLine.toLowerCase().includes('keputusan'))) {
        
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim(),
            icon: getSectionIcon(currentSection)
          });
        }
        
        // Start new section - extract title from either format
        let sectionTitle = '';
        if (trimmedLine.startsWith('#### ')) {
          sectionTitle = trimmedLine.replace(/^#### /, '').trim();
        } else {
          sectionTitle = trimmedLine.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
        }
        
        currentSection = sectionTitle;
        currentContent = [];
      } else if (trimmedLine.length > 0) {
        // Add content to current section
        currentContent.push(trimmedLine);
      }
    }

    // Add last section
    if (currentSection && currentContent.length > 0) {
      sections.push({
        title: currentSection,
        content: currentContent.join('\n').trim(),
        icon: getSectionIcon(currentSection)
      });
    }

    return { hasContent: true, sections };
  };  // Get appropriate icon for each section
  const getSectionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('topik utama')) return '🎯';
    if (lowerTitle.includes('poin')) return '👥';
    if (lowerTitle.includes('keputusan') || lowerTitle.includes('kesimpulan')) return '✅';
    if (lowerTitle.includes('action items')) return '📋';
    return '📌';
  };

  const summaryText = localSummary || summaryData?.summary || "No summary available yet. Click 'Regenerate Summary' to generate one.";
  
  // Debug logging
  console.log('📋 Full Summary Data:', summaryData);
  console.log('🔧 Local Summary:', localSummary);
  console.log('📝 Final Summary Text:', summaryText);
  console.log('📝 Summary Text Type:', typeof summaryText);
  console.log('📝 Summary Text Length:', summaryText?.length);
  
  const parsedSummary = parseSummaryContent(summaryText);
  console.log('🔍 Parsed Summary:', parsedSummary);

  return (
    <div className="summary-tab">
      <div className="summary-header">
        <h2 className="summary-title">
          <span className="icon">📋</span>
          Meeting Summary
        </h2>
        <button 
          onClick={handleRegenerateSummary} 
          disabled={isRegenerating || !jobId}
          className="regenerate-button"
        >
          {isRegenerating ? (
            <>
              <span className="loading-spinner">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <span className="icon">🔄</span>
              Regenerate Summary
            </>
          )}
        </button>
      </div>

      <div className="summary-content">
        {/* Main Summary Sections - Only show non-redundant content */}
        {parsedSummary.hasContent && (
          <div className="summary-sections">
            {parsedSummary.sections && parsedSummary.sections.map((section, index) => (
              <div key={index} className="summary-section">
                <h3 className="section-title">
                  <span className="section-icon">{section.icon}</span>
                  {section.title}
                </h3>
                <div className="section-content">
                  {section.content.split('\n').map((line: string, lineIndex: number) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                      return (
                        <div key={lineIndex} className="bullet-point">
                          <span className="bullet">•</span>
                          <span className="bullet-text">{trimmedLine.replace(/^[-•]\s*/, '')}</span>
                        </div>
                      );
                    } else if (trimmedLine.length > 0) {
                      return <p key={lineIndex} className="section-paragraph">{trimmedLine}</p>;
                    }
                    return null;
                  }).filter(Boolean)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show fallback message if no content */}
        {!parsedSummary.hasContent && (!summaryData?.action_items?.length && !summaryData?.key_decisions?.length) && (
          <div className="summary-box no-content">
            <div className="summary-text">
              <p>{summaryText}</p>
            </div>
          </div>
        )}

        {/* Structured Data Sections - Always show if available */}
        {summaryData?.key_decisions && summaryData.key_decisions.length > 0 && (
          <div className="summary-section structured-section">
            <h3 className="section-title">
              <span className="section-icon">✅</span>
              KEPUTUSAN ATAU KESIMPULAN
            </h3>
            <div className="section-content">
              {summaryData.key_decisions.map((decision: string, index: number) => (
                <div key={index} className="bullet-point">
                  <span className="bullet">•</span>
                  <span className="bullet-text">{decision}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryData?.action_items && summaryData.action_items.length > 0 && (
          <div className="summary-section structured-section">
            <h3 className="section-title">
              <span className="section-icon">📋</span>
              ACTION ITEMS
            </h3>
            <div className="section-content">
              {summaryData.action_items.map((item: string, index: number) => (
                <div key={index} className="bullet-point">
                  <span className="bullet">•</span>
                  <span className="bullet-text">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryData?.speaker_points && summaryData.speaker_points.length > 0 && (
          <div className="summary-section structured-section">
            <h3 className="section-title">
              <span className="section-icon">👥</span>
              KONTRIBUSI PEMBICARA
            </h3>
            <div className="section-content">
              {summaryData.speaker_points.map((point: string, index: number) => (
                <div key={index} className="bullet-point">
                  <span className="bullet">•</span>
                  <span className="bullet-text">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summaryData?.point_of_view && summaryData.point_of_view.length > 0 && (
          <div className="summary-section structured-section">
            <h3 className="section-title">
              <span className="section-icon">💭</span>
              POIN-POIN PENTING DARI SETIAP PEMBICARA
            </h3>
            <div className="section-content">
              {summaryData.point_of_view.map((viewpoint: string, index: number) => (
                <div key={index} className="bullet-point">
                  <span className="bullet">•</span>
                  <span className="bullet-text">{viewpoint}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryTab;
