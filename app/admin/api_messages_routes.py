# Arquivo: app/admin/api_messages_routes.py

import os
from flask import jsonify, request
from app import socketio
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/messages', methods=['GET'])
@admin_required
def get_contact_messages():
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM contact_messages ORDER BY received_at DESC')
    messages = cursor.fetchall()
    cursor.close()
    # --- FIM DA CORREÇÃO ---
    conn.close()
    return jsonify([dict(row) for row in messages])

@admin_bp.route('/api/messages/<int:message_id>/read', methods=['POST'])
@admin_required
def mark_message_as_read(message_id):
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'UPDATE contact_messages SET is_read = 1 WHERE id = {placeholder}'
        cursor.execute(query, (message_id,))
        conn.commit()
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print(f"Erro ao marcar mensagem como lida: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor.'}), 500
    finally:
        cursor.close()
        conn.close()
    # --- FIM DA CORREÇÃO ---

@admin_bp.route('/api/messages/<int:message_id>', methods=['DELETE'])
@admin_required
def delete_contact_message(message_id):
    conn = get_db_connection()
    # --- INÍCIO DA CORREÇÃO ---
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'DELETE FROM contact_messages WHERE id = {placeholder}'
        cursor.execute(query, (message_id,))
        conn.commit()
        socketio.emit('message_deleted', {'message_id': message_id})
        return jsonify({'success': True})
    except Exception as e:
        conn.rollback()
        print(f"Erro ao deletar mensagem: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor.'}), 500
    finally:
        cursor.close()
        conn.close()
    # --- FIM DA CORREÇÃO ---