"""Resource service for managing learning resources and tips."""

from typing import Dict, Any, List, Optional
from app.config.supabase_client import supabase_admin
from app.utils.responses import APIError


class ResourceService:
    """Service class for resource and tips operations."""

    @staticmethod
    def list_resources(category: Optional[str] = None, difficulty: Optional[str] = None, resource_type: Optional[str] = None, search: Optional[str] = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """List resources with optional filters."""
        try:
            query = supabase_admin.table('resources').select('*', count='exact').eq('is_published', True)

            if category:
                query = query.eq('category', category)
            if difficulty:
                query = query.eq('difficulty', difficulty)
            if resource_type:
                query = query.eq('resource_type', resource_type)
            if search:
                query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")

            response = query.order('read_count', desc=True).range(offset, offset + limit - 1).execute()

            resources = [{
                "id": r['id'],
                "title": r['title'],
                "description": r.get('description'),
                "content": r.get('content'),
                "category": r['category'],
                "tags": r.get('tags', []),
                "resourceType": r.get('resource_type'),
                "difficulty": r.get('difficulty'),
                "readCount": r.get('read_count', 0),
                "createdAt": r['created_at']
            } for r in response.data]

            return {"resources": resources, "total": response.count or len(resources)}
        except Exception as e:
            raise APIError(f"Failed to list resources: {str(e)}", 500)

    @staticmethod
    def get_resource(resource_id: str) -> Dict[str, Any]:
        """Get resource by ID."""
        try:
            response = supabase_admin.table('resources').select('*').eq('id', resource_id).execute()
            if not response.data:
                raise APIError("Resource not found", 404)

            r = response.data[0]
            return {
                "id": r['id'], "title": r['title'], "description": r.get('description'),
                "content": r.get('content'), "category": r['category'],
                "tags": r.get('tags', []), "resourceType": r.get('resource_type'),
                "difficulty": r.get('difficulty'), "isPublished": r.get('is_published'),
                "createdAt": r['created_at'], "updatedAt": r.get('updated_at')
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to get resource: {str(e)}", 500)

    @staticmethod
    def create_resource(title: str, category: str, resource_type: str, description: str = None, content: str = None, tags: list = None, difficulty: str = None, created_by: str = None) -> Dict[str, Any]:
        """Create a new resource (admin only)."""
        try:
            insert_data = {
                'title': title, 'category': category, 'resource_type': resource_type,
                'description': description, 'content': content,
                'tags': tags or [], 'difficulty': difficulty, 'created_by': created_by
            }
            response = supabase_admin.table('resources').insert(insert_data).execute()
            if not response.data:
                raise APIError("Failed to create resource", 500)

            r = response.data[0]
            return {
                "id": r['id'], "title": r['title'], "description": r.get('description'),
                "category": r['category'], "resourceType": r.get('resource_type'),
                "difficulty": r.get('difficulty'), "createdAt": r['created_at']
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to create resource: {str(e)}", 500)

    @staticmethod
    def update_resource(resource_id: str, **kwargs) -> Dict[str, Any]:
        """Update a resource (admin only)."""
        try:
            update_data = {k: v for k, v in kwargs.items() if v is not None}
            if not update_data:
                raise APIError("No update data provided", 400)

            response = supabase_admin.table('resources').update(update_data).eq('id', resource_id).execute()
            if not response.data:
                raise APIError("Resource not found", 404)

            r = response.data[0]
            return {
                "id": r['id'], "title": r['title'], "description": r.get('description'),
                "category": r['category'], "resourceType": r.get('resource_type'),
                "difficulty": r.get('difficulty'), "updatedAt": r.get('updated_at')
            }
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to update resource: {str(e)}", 500)

    @staticmethod
    def delete_resource(resource_id: str) -> Dict[str, str]:
        """Delete a resource (admin only)."""
        try:
            response = supabase_admin.table('resources').delete().eq('id', resource_id).execute()
            if not response.data:
                raise APIError("Resource not found", 404)
            return {"message": "Resource deleted successfully"}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to delete resource: {str(e)}", 500)

    @staticmethod
    def get_tips(category: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get tips and best practices (resource_type = 'tip' OR 'exercise')."""
        try:
            query = (
                supabase_admin.table('resources')
                .select('*')
                .eq('is_published', True)
                .in_('resource_type', ['tip', 'exercise'])
            )
            if category:
                query = query.eq('category', category)

            response = query.order('read_count', desc=True).limit(limit).execute()
            return [{
                "id": r['id'], "title": r['title'], "content": r.get('content'),
                "description": r.get('description'),
                "category": r['category'], "tags": r.get('tags', []),
                "readCount": r.get('read_count', 0)
            } for r in response.data]
        except Exception as e:
            raise APIError(f"Failed to get tips: {str(e)}", 500)

    @staticmethod
    def track_read(resource_id: str) -> Dict[str, Any]:
        """Increment read_count for a resource and return the updated count."""
        try:
            res = supabase_admin.table('resources').select('read_count').eq('id', resource_id).execute()
            if not res.data:
                raise APIError("Resource not found", 404)
            current = res.data[0].get('read_count') or 0
            updated = supabase_admin.table('resources').update(
                {'read_count': current + 1}
            ).eq('id', resource_id).execute()
            new_count = updated.data[0].get('read_count', current + 1) if updated.data else current + 1
            return {"resourceId": resource_id, "readCount": new_count}
        except APIError:
            raise
        except Exception as e:
            raise APIError(f"Failed to track read: {str(e)}", 500)
