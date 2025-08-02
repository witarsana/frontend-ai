# Notion API Integration for Action Items Enhancement

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import json
import logging
from datetime import datetime
import os
from dotenv import load_dotenv

# Notion SDK import
try:
    from notion_client import Client as NotionClient
    NOTION_SDK_AVAILABLE = True
    print("✅ Notion SDK available")
except ImportError:
    print("⚠️  Notion SDK not available. Install with: pip install notion-client")
    NotionClient = None
    NOTION_SDK_AVAILABLE = False

# Import AI models
try:
    from .multi_model_chat import MultiModelChatSystem
    AI_CHAT_AVAILABLE = True
except ImportError:
    try:
        from multi_model_chat import MultiModelChatSystem
        AI_CHAT_AVAILABLE = True
    except ImportError:
        print("Warning: AI Chat not available. Using fallback.")
        MultiModelChatSystem = None
        AI_CHAT_AVAILABLE = False

load_dotenv()
router = APIRouter()
logger = logging.getLogger(__name__)

class ActionItemRequest(BaseModel):
    action_item: Dict[str, Any]
    meeting_context: str
    session_id: str
    database_id: Optional[str] = None

class NotionCreateRequest(BaseModel):
    action_item: Dict[str, Any]
    meeting_context: str
    session_id: str
    database_id: str

class NotionTestRequest(BaseModel):
    database_id: str

class ActionItemResponse(BaseModel):
    enhanced_description: str
    suggested_priority: Optional[str] = None
    suggested_category: Optional[str] = None
    estimated_effort: Optional[str] = None
    dependencies: Optional[List[str]] = None
    success: bool = True

class NotionResponse(BaseModel):
    success: bool
    page_id: Optional[str] = None
    url: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None
    details: Optional[str] = None

@router.post("/notion/create-action-item", response_model=NotionResponse)
async def create_notion_action_item(request: NotionCreateRequest):
    """
    Create an action item page in Notion database
    """
    if not NOTION_SDK_AVAILABLE:
        raise HTTPException(
            status_code=503, 
            detail="Notion SDK not available. Please install notion-client package."
        )
    
    try:
        # Get Notion API key from environment
        notion_api_key = os.getenv('NOTION_API_KEY')
        if not notion_api_key:
            raise HTTPException(
                status_code=500,
                detail="NOTION_API_KEY not configured in environment variables"
            )
        
        # Initialize Notion client
        notion = NotionClient(auth=notion_api_key)
        
        # Extract action item details
        action_item = request.action_item
        task = action_item.get('task', 'Unknown task')
        assignee = action_item.get('assignee', '')
        deadline = action_item.get('deadline', '')
        priority = action_item.get('priority', 'Medium')
        status = action_item.get('status', 'Not Started')
        
        # Enhance description with AI if available
        enhanced_description = await enhance_with_ai(
            action_item, 
            request.meeting_context, 
            request.session_id
        )
        
        # Determine category
        category = categorize_action_item(task)
        
        # Parse deadline
        deadline_date = parse_deadline(deadline) if deadline else None
        
        # Create title (max 100 chars for Notion)
        title = task[:97] + '...' if len(task) > 97 else task
        
        # Prepare page properties
        page_properties = {
            'Name': {
                'title': [
                    {
                        'text': {
                            'content': title
                        }
                    }
                ]
            },
            'Description': {
                'rich_text': [
                    {
                        'text': {
                            'content': enhanced_description[:2000]  # Notion limit
                        }
                    }
                ]
            },
            'Assignee': {
                'rich_text': [
                    {
                        'text': {
                            'content': assignee or 'Unassigned'
                        }
                    }
                ]
            },
            'Priority': {
                'select': {
                    'name': priority
                }
            },
            'Status': {
                'select': {
                    'name': status
                }
            },
            'Category': {
                'select': {
                    'name': category
                }
            },
            'Meeting Source': {
                'rich_text': [
                    {
                        'text': {
                            'content': f'Voice Note AI - Session {request.session_id}'
                        }
                    }
                ]
            },
            'Created': {
                'date': {
                    'start': datetime.now().isoformat()[:10]
                }
            }
        }
        
        # Add deadline if available
        if deadline_date:
            page_properties['Deadline'] = {
                'date': {
                    'start': deadline_date
                }
            }
        
        # Create page in Notion
        page_data = {
            'parent': {
                'database_id': request.database_id
            },
            'properties': page_properties
        }
        
        response = notion.pages.create(**page_data)
        
        return NotionResponse(
            success=True,
            page_id=response['id'],
            url=response.get('url', ''),
            message='Action item successfully added to Notion!'
        )
        
    except Exception as e:
        logger.error(f"Notion integration error: {str(e)}")
        
        # Handle specific Notion errors
        error_message = str(e)
        if 'validation_error' in error_message:
            return NotionResponse(
                success=False,
                error='Database schema mismatch',
                details='Please check your Notion database properties match the expected format.'
            )
        elif 'unauthorized' in error_message:
            return NotionResponse(
                success=False,
                error='Notion API key invalid',
                details='Please check your NOTION_API_KEY configuration.'
            )
        elif 'object_not_found' in error_message:
            return NotionResponse(
                success=False,
                error='Database not found',
                details='Please check your database ID is correct and accessible.'
            )
        else:
            return NotionResponse(
                success=False,
                error='Failed to create Notion page',
                details=error_message
            )

@router.post("/notion/test-connection")
async def test_notion_connection(request: NotionTestRequest):
    """
    Test connection to Notion database
    """
    if not NOTION_SDK_AVAILABLE:
        return {
            "success": False,
            "message": "Notion SDK not available"
        }
    
    try:
        notion_api_key = os.getenv('NOTION_API_KEY')
        if not notion_api_key:
            return {
                "success": False,
                "message": "NOTION_API_KEY not configured"
            }
        
        notion = NotionClient(auth=notion_api_key)
        
        # Try to retrieve database info
        database = notion.databases.retrieve(database_id=request.database_id)
        
        database_title = ""
        if database.get('title') and len(database['title']) > 0:
            database_title = database['title'][0].get('plain_text', 'Untitled')
        
        return {
            "success": True,
            "message": f"Connected to database: {database_title}"
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}"
        }

@router.post("/enhance-action-item", response_model=ActionItemResponse)
async def enhance_action_item(request: ActionItemRequest):
    """
    Enhance action item details using AI for better Notion integration
    """
    try:
        action_item = request.action_item
        meeting_context = request.meeting_context
        
        # Extract basic action item details
        task = action_item.get('task', '')
        assignee = action_item.get('assignee', '')
        deadline = action_item.get('deadline', '')
        
        if not task:
            raise HTTPException(status_code=400, detail="Task description is required")
        
        # Enhance description with AI
        enhanced_description = await enhance_with_ai(action_item, meeting_context, request.session_id)
        
        # Extract structured data from the enhanced description
        analysis = analyze_enhanced_description(enhanced_description, task)
        
        return ActionItemResponse(
            enhanced_description=enhanced_description,
            suggested_priority=analysis.get('priority'),
            suggested_category=analysis.get('category'),
            estimated_effort=analysis.get('effort'),
            dependencies=analysis.get('dependencies', []),
            success=True
        )
        
    except Exception as e:
        logger.error(f"Action item enhancement failed: {str(e)}")
        
        # Fallback enhancement when AI fails
        fallback_description = create_fallback_enhancement(action_item, meeting_context)
        
        return ActionItemResponse(
            enhanced_description=fallback_description,
            suggested_priority="Medium",
            suggested_category="General",
            estimated_effort="To be determined",
            dependencies=[],
            success=True
        )

async def enhance_with_ai(action_item: dict, context: str, session_id: str) -> str:
    """
    Use AI to enhance action item description
    """
    try:
        if not AI_CHAT_AVAILABLE or MultiModelChatSystem is None:
            raise Exception("AI Chat system not available")
        
        task = action_item.get('task', '')
        assignee = action_item.get('assignee', '')
        deadline = action_item.get('deadline', '')
        
        # Create AI prompt for enhancement
        enhancement_prompt = f"""
You are an AI assistant helping to enhance action items from meeting transcriptions for project management in Notion.

Original Action Item:
- Task: {task}
- Assignee: {assignee or 'Not specified'}
- Deadline: {deadline or 'Not specified'}

Meeting Context (for reference):
{context[:1000]}...

Please enhance this action item with the following:

1. **Detailed Description**: Expand the task with more context, clear objectives, and specific deliverables
2. **Priority Assessment**: Suggest priority level (High/Medium/Low) based on task urgency and importance
3. **Category**: Categorize the task (Development, Design, Meeting, Documentation, Testing, Communication, Planning, Research, or General)
4. **Effort Estimation**: Estimate time/effort required (e.g., "2-3 hours", "1-2 days", "1 week")
5. **Dependencies**: Identify any dependencies or prerequisites
6. **Success Criteria**: Define what "done" looks like

Format your response as a detailed but concise description that would be helpful in a project management tool.

Enhanced Description:"""
        
        # Initialize AI chat system
        chat_system = MultiModelChatSystem()
        
        # Get AI response
        response = await chat_system.generate_response(
            prompt=enhancement_prompt, 
            session_id=session_id,
            context_limit=2000
        )
        
        if response and response.strip():
            return response.strip()
        else:
            raise Exception("Empty AI response")
            
    except Exception as e:
        logger.warning(f"AI enhancement failed: {e}")
        return create_fallback_enhancement(action_item, context)

def create_fallback_enhancement(action_item: dict, meeting_context: str) -> str:
    """
    Create enhanced description without AI as fallback
    """
    task = action_item.get('task', '')
    assignee = action_item.get('assignee', '')
    deadline = action_item.get('deadline', '')
    
    description_parts = []
    
    # Main task description
    description_parts.append(f"**Objective:** {task}")
    
    # Add assignee if available
    if assignee:
        description_parts.append(f"**Assigned to:** {assignee}")
    
    # Add deadline if available
    if deadline:
        description_parts.append(f"**Target deadline:** {deadline}")
    
    # Add context
    description_parts.append("**Context:** This action item was identified during a meeting transcription analysis.")
    
    # Add relevant meeting context (truncated)
    if meeting_context:
        context_snippet = meeting_context[:300] + "..." if len(meeting_context) > 300 else meeting_context
        description_parts.append(f"**Meeting background:** {context_snippet}")
    
    # Add default structure
    description_parts.extend([
        "**Next steps:**",
        "1. Review task requirements and scope",
        "2. Identify any dependencies or blockers", 
        "3. Create detailed implementation plan",
        "4. Execute and track progress",
        "",
        "**Success criteria:** Task completed according to requirements and within deadline.",
        "",
        f"**Created:** {datetime.now().strftime('%Y-%m-%d %H:%M')} via Voice Note AI"
    ])
    
    return "\n\n".join(description_parts)

def categorize_action_item(task: str) -> str:
    """
    Categorize action item based on content
    """
    categories = {
        'Development': ['code', 'develop', 'implement', 'build', 'program', 'technical', 'api', 'database'],
        'Design': ['design', 'ui', 'ux', 'wireframe', 'mockup', 'prototype', 'visual'],
        'Meeting': ['meeting', 'call', 'discussion', 'presentation', 'demo', 'review'],
        'Documentation': ['document', 'write', 'documentation', 'spec', 'report', 'manual'],
        'Testing': ['test', 'qa', 'quality', 'bug', 'debug', 'verify'],
        'Communication': ['email', 'notify', 'inform', 'communicate', 'update', 'share'],
        'Planning': ['plan', 'schedule', 'organize', 'prepare', 'strategy'],
        'Research': ['research', 'investigate', 'analyze', 'study', 'explore']
    }

    task_lower = task.lower()
    
    for category, keywords in categories.items():
        if any(keyword in task_lower for keyword in keywords):
            return category
    
    return 'General'  # Default category

def parse_deadline(deadline_str: str) -> Optional[str]:
    """
    Parse deadline string to YYYY-MM-DD format
    """
    if not deadline_str:
        return None
    
    try:
        # Handle relative dates
        deadline_lower = deadline_str.lower()
        
        if 'today' in deadline_lower:
            return datetime.now().strftime('%Y-%m-%d')
        elif 'tomorrow' in deadline_lower:
            tomorrow = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            tomorrow = tomorrow.replace(day=tomorrow.day + 1)
            return tomorrow.strftime('%Y-%m-%d')
        elif 'next week' in deadline_lower:
            next_week = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            next_week = next_week.replace(day=next_week.day + 7)
            return next_week.strftime('%Y-%m-%d')
        elif 'this week' in deadline_lower:
            # Friday of this week
            now = datetime.now()
            friday = now.replace(day=now.day + (4 - now.weekday()))
            return friday.strftime('%Y-%m-%d')
        
        # Try to parse date directly
        from dateutil import parser
        parsed_date = parser.parse(deadline_str, fuzzy=True)
        return parsed_date.strftime('%Y-%m-%d')
        
    except Exception:
        # Default to next week if parsing fails
        next_week = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        next_week = next_week.replace(day=next_week.day + 7)
        return next_week.strftime('%Y-%m-%d')

def analyze_enhanced_description(description: str, original_task: str) -> dict:
    """
    Extract structured data from enhanced description
    """
    analysis = {}
    
    description_lower = description.lower()
    
    # Determine priority
    if any(word in description_lower for word in ['urgent', 'critical', 'asap', 'high priority', 'immediately']):
        analysis['priority'] = 'High'
    elif any(word in description_lower for word in ['low priority', 'when time permits', 'optional']):
        analysis['priority'] = 'Low'
    else:
        analysis['priority'] = 'Medium'
    
    # Determine category
    analysis['category'] = categorize_action_item(original_task)
    
    # Extract effort estimation
    effort_patterns = ['hour', 'day', 'week', 'month', 'minute']
    
    for pattern in effort_patterns:
        if pattern in description_lower:
            import re
            effort_match = re.search(rf'(\d+[-–]\d+\s*{pattern})', description_lower)
            if effort_match:
                analysis['effort'] = effort_match.group(1)
                break
            effort_match = re.search(rf'(\d+\s*{pattern})', description_lower)
            if effort_match:
                analysis['effort'] = effort_match.group(1)
                break
    
    if 'effort' not in analysis:
        analysis['effort'] = 'To be estimated'
    
    # Extract dependencies
    dependencies = []
    if 'depends on' in description_lower or 'requires' in description_lower:
        dependencies.append('Has dependencies - check description')
    
    analysis['dependencies'] = dependencies
    
    return analysis

# Health check endpoint
@router.get("/notion-integration/health")
async def health_check():
    """
    Check if the Notion integration is working
    """
    return {
        "status": "healthy",
        "service": "notion-action-item-integration",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "notion_sdk": NOTION_SDK_AVAILABLE,
            "ai_enhancement": AI_CHAT_AVAILABLE,
            "fallback_enhancement": True
        }
    }
