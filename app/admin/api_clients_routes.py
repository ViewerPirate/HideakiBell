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
    
    # MODIFICAÇÃO: Renomeado 'name' para 'username' para consistência.
    cursor.execute('SELECT id, username, is_blocked, is_banned, created_at, is_admin FROM users ORDER BY username')
    clients_db = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in clients_db])

@admin_bp.route('/api/clients', methods=['POST'])
@admin_required
def create_client():
    data = request.get_json()
    # MODIFICAÇÃO: Renomeado 'name' para 'username'
    username = data.get('username')
    if not username:
        return jsonify({'success': False, 'message': 'O nome de usuário é obrigatório.'}), 400

    hashed_password = generate_password_hash("senha_padrao_cliente")
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'INSERT INTO users (username, password_hash) VALUES ({placeholder}, {placeholder})'
        cursor.execute(query, (username, hashed_password))
        conn.commit()
    except Exception:
        conn.rollback()
        return jsonify({'success': False, 'message': 'Nome de usuário já existe.'}), 409
    finally:
        cursor.close()
        conn.close()
    return jsonify({'success': True, 'message': 'Cliente criado com sucesso.'})

# --- INÍCIO DA MODIFICAÇÃO: Rota unificada para GET, PUT, DELETE ---
@admin_bp.route('/api/clients/<int:client_id>', methods=['GET', 'PUT', 'DELETE'])
@admin_required
def manage_single_client(client_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    # --- MÉTODO GET: Buscar um único cliente ---
    if request.method == 'GET':
        try:
            # MODIFICAÇÃO: Renomeado 'name' para 'username'
            query = f'SELECT id, username, is_blocked, is_banned, notify_on_site, notify_by_email, created_at FROM users WHERE id = {placeholder}'
            cursor.execute(query, (client_id,))
            client = cursor.fetchone()
            if client is None:
                return jsonify({'error': 'Cliente não encontrado'}), 404
            return jsonify(dict(client))
        finally:
            cursor.close()
            conn.close()

    # --- MÉTODO PUT: Atualizar username e/ou senha ---
    if request.method == 'PUT':
        data = request.get_json()
        new_username = data.get('username')
        new_password = data.get('password')

        if not new_username and not new_password:
            conn.close()
            return jsonify({'success': False, 'message': 'Nenhum dado para atualizar foi fornecido.'}), 400

        try:
            # Verifica se o novo nome de usuário já está em uso por outra conta
            if new_username:
                cursor.execute(f"SELECT id FROM users WHERE username = {placeholder} AND id != {placeholder}", (new_username, client_id))
                if cursor.fetchone():
                    return jsonify({'success': False, 'message': 'Este nome de usuário já está em uso.'}), 409

            updates = []
            params = []
            if new_username:
                updates.append(f"username = {placeholder}")
                params.append(new_username)
            if new_password:
                hashed_password = generate_password_hash(new_password)
                updates.append(f"password_hash = {placeholder}")
                params.append(hashed_password)
            
            params.append(client_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = {placeholder}"
            
            cursor.execute(query, tuple(params))
            conn.commit()
            
            return jsonify({'success': True, 'message': 'Dados do cliente atualizados com sucesso.'})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
        finally:
            cursor.close()
            conn.close()

    # --- MÉTODO DELETE: Excluir um cliente ---
    if request.method == 'DELETE':
        if client_id == session.get('user_id'):
            conn.close()
            return jsonify({'success': False, 'message': 'Você não pode excluir sua própria conta.'}), 403

        try:
            # Anula a referência do cliente nas comissões para manter o histórico financeiro
            cursor.execute(f"UPDATE comissoes SET client_id = NULL WHERE client_id = {placeholder}", (client_id,))
            # Exclui notificações associadas
            cursor.execute(f"DELETE FROM notifications WHERE user_id = {placeholder}", (client_id,))
            # Exclui dados de plugins associados
            cursor.execute(f"DELETE FROM plugin_data WHERE user_id = {placeholder}", (client_id,))
            # Exclui os serviços do artista (se for um)
            cursor.execute(f"DELETE FROM artist_services WHERE artist_id = {placeholder}", (client_id,))
            # Finalmente, exclui o usuário
            cursor.execute(f"DELETE FROM users WHERE id = {placeholder}", (client_id,))
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Cliente excluído com sucesso.'})
        except Exception as e:
            conn.rollback()
            return jsonify({'success': False, 'message': f'Erro no servidor: {e}'}), 500
        finally:
            cursor.close()
            conn.close()
# --- FIM DA MODIFICAÇÃO ---

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