# Arquivo: app/client/api_account_routes.py

import sqlite3
import os
from flask import request, jsonify, session, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import get_db_connection, login_required
from .routes import client_bp

# Rota para atualizar o nome de usuário e avatar
@client_bp.route('/api/client/account/profile', methods=['POST'])
@login_required
def update_profile():
    data = request.get_json()
    new_username = data.get('username')
    new_avatar = data.get('avatar_url')
    user_id = session.get('user_id')

    if not new_username:
        return jsonify({'success': False, 'message': 'O nome de usuário é obrigatório.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        # Verifica se o novo nome de usuário já está em uso por outra conta
        query_check = f'SELECT id FROM users WHERE username = {placeholder} AND id != {placeholder}'
        cursor.execute(query_check, (new_username, user_id))
        existing_user = cursor.fetchone()

        if existing_user:
            return jsonify({'success': False, 'message': 'Este nome de usuário já está em uso por outra conta.'}), 409

        # Atualiza apenas o nome de usuário e o avatar
        query_update = f'UPDATE users SET username = {placeholder}, artist_avatar = {placeholder} WHERE id = {placeholder}'
        cursor.execute(query_update, (new_username, new_avatar, user_id))
        conn.commit()

        session['username'] = new_username
        session['avatar_url'] = new_avatar
        
        return jsonify({
            'success': True,
            'message': 'Perfil atualizado com sucesso!',
            'newUsername': new_username,
            'newAvatar': new_avatar
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no banco de dados: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# Rota para alterar a senha
@client_bp.route('/api/client/account/password', methods=['POST'])
@login_required
def update_password():
    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    user_id = session.get('user_id')

    if not current_password or not new_password:
        return jsonify({'success': False, 'message': 'Todos os campos de senha são obrigatórios.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'

    try:
        query_select = f'SELECT password_hash FROM users WHERE id = {placeholder}'
        cursor.execute(query_select, (user_id,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password_hash'], current_password):
            return jsonify({'success': False, 'message': 'A senha atual está incorreta.'}), 403

        new_password_hash = generate_password_hash(new_password)
        query_update = f'UPDATE users SET password_hash = {placeholder} WHERE id = {placeholder}'
        cursor.execute(query_update, (new_password_hash, user_id))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Senha alterada com sucesso!'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no banco de dados: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# Rota para excluir a conta do usuário
@client_bp.route('/api/client/account/delete', methods=['POST'])
@login_required
def delete_account():
    data = request.get_json()
    password = data.get('password')
    user_id = session.get('user_id')

    if not password:
        return jsonify({'success': False, 'message': 'A senha é obrigatória para excluir a conta.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    try:
        query_select = f'SELECT password_hash FROM users WHERE id = {placeholder}'
        cursor.execute(query_select, (user_id,))
        user = cursor.fetchone()

        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'success': False, 'message': 'A senha está incorreta.'}), 403
        
        deleted_username = f"usuario_deletado_{user_id}"
        
        # Atualiza o usuário para um estado anônimo/deletado, sem o campo de email
        query_update = f'UPDATE users SET username = {placeholder}, password_hash = {placeholder}, is_blocked = 1, is_banned = 1 WHERE id = {placeholder}'
        cursor.execute(query_update, (deleted_username, 'deleted', user_id))
        conn.commit()

        session.clear()
        
        return jsonify({
            'success': True, 
            'message': 'Sua conta foi excluída com sucesso.',
            'redirectUrl': url_for('auth.login')
        })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro no banco de dados: {e}'}), 500
    finally:
        cursor.close()
        conn.close()