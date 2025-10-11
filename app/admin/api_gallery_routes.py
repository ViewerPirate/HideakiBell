# Arquivo: app/admin/api_gallery_routes.py

import os
from flask import jsonify, request, session
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/gallery', methods=['GET'])
@admin_required
def get_gallery():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Query explícita para garantir que pegamos as colunas novas
    cursor.execute('SELECT id, title, description, image_url, created_at, lineart_artist_id, color_artist_id, is_nsfw FROM gallery ORDER BY created_at DESC')
    arts = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in arts])

@admin_bp.route('/api/gallery', methods=['POST'])
@admin_required
def add_to_gallery():
    data = request.get_json()
    
    lineart_artist_id = data.get('lineart_artist_id')
    color_artist_id = data.get('color_artist_id')

    # Converte strings vazias para None para que o DB aceite como NULL
    if not lineart_artist_id:
        lineart_artist_id = None
    if not color_artist_id:
        color_artist_id = None

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'INSERT INTO gallery (title, image_url, description, lineart_artist_id, color_artist_id, is_nsfw) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})'
        cursor.execute(query, (
            data.get('title'), 
            data.get('image_url'), 
            data.get('description'), 
            lineart_artist_id, 
            color_artist_id, 
            data.get('is_nsfw', False)
        ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

    return jsonify({'success': True})

@admin_bp.route('/api/gallery/<int:art_id>', methods=['DELETE'])
@admin_required
def delete_from_gallery(art_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'DELETE FROM gallery WHERE id = {placeholder}'
        cursor.execute(query, (art_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
    return jsonify({'success': True})