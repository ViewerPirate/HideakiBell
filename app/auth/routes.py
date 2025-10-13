# app/auth/routes.py - Autenticação por Usuário/Senha com Validações

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils import get_db_connection
import re # Importado para validação de senha

auth_bp = Blueprint('auth', __name__, template_folder='../../templates')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        conn = get_db_connection()
        cursor = conn.cursor()
        is_postgres = hasattr(conn, 'cursor_factory')
        placeholder = '%s' if is_postgres else '?'
        
        # Modificado para buscar por 'username' em vez de 'email'
        query = f'SELECT * FROM users WHERE username = {placeholder}'
        cursor.execute(query, (username,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = user['is_admin']
            # A linha que tentava pegar o email foi REMOVIDA
            session['avatar_url'] = user['artist_avatar']
            flash('Login realizado com sucesso!', 'success')
            
            if user['is_admin']:
                return redirect(url_for('admin.admin_dashboard'))
            else:
                return redirect(url_for('client.client_dashboard'))
        else:
            flash('Nome de usuário ou senha incorretos.', 'error')
    return render_template('login.html')

@auth_bp.route('/registro', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # --- Validação de Senha Forte ---
        if len(password) < 8:
            flash('A senha deve ter pelo menos 8 caracteres.', 'error')
            return render_template('registro.html')
        if not re.search(r'[A-Z]', password):
            flash('A senha deve conter pelo menos uma letra maiúscula.', 'error')
            return render_template('registro.html')
        if not re.search(r'[a-z]', password):
            flash('A senha deve conter pelo menos uma letra minúscula.', 'error')
            return render_template('registro.html')
        if not re.search(r'[0-9]', password):
            flash('A senha deve conter pelo menos um número.', 'error')
            return render_template('registro.html')

        conn = get_db_connection()
        cursor = conn.cursor()
        is_postgres = hasattr(conn, 'cursor_factory')
        placeholder = '%s' if is_postgres else '?'
        
        # --- Verificação de Nomes de Usuário Parecidos (case-insensitive) ---
        cursor.execute(f'SELECT username FROM users WHERE LOWER(username) = LOWER({placeholder})', (username,))
        if cursor.fetchone():
            flash('Este nome de usuário já está em uso ou é muito parecido com um existente. Escolha outro.', 'error')
            cursor.close()
            conn.close()
            return render_template('registro.html')
            
        # --- Criação do Usuário (sem email) ---
        hashed_password = generate_password_hash(password)
        query_insert = f'INSERT INTO users (username, password_hash) VALUES ({placeholder}, {placeholder})'
        cursor.execute(query_insert, (username, hashed_password))
        conn.commit()
        flash('Conta criada com sucesso! Por favor, faça login.', 'success')
        
        cursor.close()
        conn.close()
        return redirect(url_for('auth.login'))
        
    return render_template('registro.html')

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('Você foi desconectado.', 'info')
    return redirect(url_for('public.home'))