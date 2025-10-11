# Arquivo: app/admin/api_clients_routes.py

import os
from flask import request, jsonify, session
from werkzeug.security import generate_password_hash
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

@admin_bp.route('/api/clients', methods=['GET'])
@admin_required
def get_clients():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Removida a coluna 'email' da consulta
    cursor.execute('SELECT id, username as name, is_blocked, is_banned, created_at, is_admin FROM users ORDER BY username')
    clients_db = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in clients_db])

@admin_bp.route('/api/clients', methods=['POST'])
@admin_required
def create_client():
    data = request.get_json()
    hashed_password = generate_password_hash("senha_padrao_cliente")
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        # Query de inserção sem o campo 'email'
        query = f'INSERT INTO users (username, password_hash) VALUES ({placeholder}, {placeholder})'
        cursor.execute(query, (data['name'], hashed_password))
        conn.commit()
    except Exception:
        conn.rollback()
        # Mensagem de erro atualizada
        return jsonify({'success': False, 'message': 'Nome de usuário já existe.'}), 409
    finally:
        cursor.close()
        conn.close()
    return jsonify({'success': True, 'message': 'Cliente criado com sucesso.'})

@admin_bp.route('/api/clients/<int:client_id>', methods=['GET'])
@admin_required
def get_single_client(client_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    # Removida a coluna 'email' da consulta
    query = f'SELECT id, username as name, is_blocked, is_banned, notify_on_site, notify_by_email, created_at FROM users WHERE id = {placeholder}'
    cursor.execute(query, (client_id,))
    client = cursor.fetchone()
    cursor.close()
    conn.close()
    if client is None:
        return jsonify({'error': 'Cliente não encontrado'}), 404
    return jsonify(dict(client))

@admin_bp.route('/api/clients/<int:client_id>/toggle_admin', methods=['POST'])
@admin_required
def toggle_admin_status(client_id):
    # Verificação de segurança: impede que o admin altere o próprio status
    if client_id == session.get('user_id'):
        return jsonify({'success': False, 'message': 'Você não pode alterar seu próprio status de administrador.'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        # Usar 'NOT is_admin' é compatível com booleanos no PostgreSQL
        query = f'UPDATE users SET is_admin = NOT is_admin WHERE id = {placeholder}'
        cursor.execute(query, (client_id,))
        conn.commit()
        
        cursor.execute(f'SELECT is_admin FROM users WHERE id = {placeholder}', (client_id,))
        new_status = cursor.fetchone()['is_admin']
        
        return jsonify({'success': True, 'is_admin': new_status})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': 'Erro no servidor.'}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route('/api/clients/<int:client_id>/toggle_block', methods=['POST'])
@admin_required
def toggle_client_block(client_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    # CASE é mais seguro para tipos INTEGER em ambos os bancos
    query = f'UPDATE users SET is_blocked = CASE WHEN is_blocked = 1 THEN 0 ELSE 1 END WHERE id = {placeholder}'
    cursor.execute(query, (client_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True})

@admin_bp.route('/api/clients/<int:client_id>/toggle_ban', methods=['POST'])
@admin_required
def toggle_client_ban(client_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'UPDATE users SET is_banned = CASE WHEN is_banned = 1 THEN 0 ELSE 1 END WHERE id = {placeholder}'
    cursor.execute(query, (client_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True})

@admin_bp.route('/api/clients/<int:client_id>/update_prefs', methods=['POST'])
@admin_required
def update_client_prefs(client_id):
    prefs = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    query = f'UPDATE users SET notify_on_site = {placeholder}, notify_by_email = {placeholder} WHERE id = {placeholder}'
    cursor.execute(query, (prefs.get('notify_on_site', 1), prefs.get('notify_by_email', 1), client_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True})

@admin_bp.route('/api/notifications/unread_count', methods=['GET'])
@admin_required
def get_unread_count():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(id) as count FROM notifications WHERE is_read = 0 AND user_id IS NULL')
    count = cursor.fetchone()['count']
    cursor.close()
    conn.close()
    return jsonify({'count': count})

@admin_bp.route('/api/notifications', methods=['GET'])
@admin_required
def get_all_notifications():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM notifications WHERE user_id IS NULL ORDER BY timestamp DESC LIMIT 20')
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in notifications])

@admin_bp.route('/api/notifications/mark_read', methods=['POST'])
@admin_required
def mark_notifications_as_read():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND user_id IS NULL')
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({'success': True})

@admin_bp.route('/api/artists', methods=['GET'])
@admin_required
def get_artists():
    """Busca e retorna uma lista de todos os usuários que são administradores."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username FROM users WHERE is_admin = TRUE ORDER BY username')
    artists_db = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in artists_db])