// Notion API Service for Voice Note AI Integration
// This service acts as a client-side proxy to backend Notion integration

export interface ActionItemDetail {
  task: string;
  assignee?: string;
  deadline?: string;
  priority?: string;
  status?: string;
  category?: string;
  description?: string;
}

export interface NotionActionItem {
  title: string;
  description: string;
  assignee: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Done';
  category: string;
  meeting_source: string;
  created_date: string;
  enriched_details: string;
}

export interface NotionResponse {
  success: boolean;
  page_id?: string;
  url?: string;
  message?: string;
  error?: string;
  details?: string;
}

class NotionService {
  private baseUrl: string;

  constructor() {
    // Use import.meta.env for Vite
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  /**
   * Create a new action item page in Notion database
   */
  async createActionItemPage(
    actionItem: ActionItemDetail, 
    meetingContext: string, 
    sessionId: string
  ): Promise<NotionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notion/create-action-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_item: actionItem,
          meeting_context: meetingContext,
          session_id: sessionId,
          database_id: import.meta.env.VITE_NOTION_DATABASE_ID || 'your_notion_database_id_here'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error: any) {
      console.error('Notion Service Error:', error);
      
      return {
        success: false,
        error: 'Failed to connect to Notion service',
        details: error.message || 'Network error or service unavailable'
      };
    }
  }

  /**
   * Test Notion database connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notion/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          database_id: import.meta.env.VITE_NOTION_DATABASE_ID || 'your_notion_database_id_here'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Get Notion integration health status
   */
  async getHealthStatus(): Promise<{
    status: string;
    features: {
      ai_enhancement: boolean;
      fallback_enhancement: boolean;
    };
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/notion-integration/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error: any) {
      return {
        status: 'unavailable',
        features: {
          ai_enhancement: false,
          fallback_enhancement: true
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new NotionService();
