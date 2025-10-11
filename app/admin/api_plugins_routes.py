# Arquivo: app/admin/api_plugins_routes.py

import sqlite3
import re
import json
import os
from flask import request, jsonify
from app.utils import get_db_connection, admin_required
from .routes import admin_bp

def parse_plugin_code(code):
    """
    Usa expressões regulares para extrair metadados essenciais do código de um plugin.
    """
    try:
        plugin_id = re.search(r"export\s+const\s+id\s*=\s*['\"]([^'\"]+)['\"]", code).group(1)
        plugin_name = re.search(r"export\s+const\s+name\s*=\s*['\"]([^'\"]+)['\"]", code).group(1)
        description_match = re.search(r"export\s+const\s+description\s*=\s*['\"]([^'\"]+)['\"]", code)
        version_match = re.search(r"export\s+const\s+version\s*=\s*['\"]([^'\"]+)['\"]", code)
        return {
            'id': plugin_id,
            'name': plugin_name,
            'description': description_match.group(1) if description_match else 'Sem descrição.',
            'version': version_match.group(1) if version_match else '1.0',
            'code': code
        }
    except (AttributeError, IndexError):
        return None

@admin_bp.route('/api/plugins', methods=['GET'])
@admin_required
def get_plugins():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, description, version, is_active, scope FROM plugins ORDER BY name')
    plugins_db = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify([dict(row) for row in plugins_db])

@admin_bp.route('/api/plugins', methods=['POST'])
@admin_required
def add_plugin():
    data = request.get_json()
    code = data.get('code')
    scope = data.get('scope', 'admin')

    if scope not in ['admin', 'public']:
        return jsonify({'success': False, 'message': 'Escopo inválido.'}), 400

    if not code:
        return jsonify({'success': False, 'message': 'O código do plugin não pode estar vazio.'}), 400

    plugin_data = parse_plugin_code(code)

    if not plugin_data:
        return jsonify({'success': False, 'message': "Código do plugin inválido. 'id' e 'name' são obrigatórios."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'INSERT INTO plugins (id, name, description, version, code, is_active, scope) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})'
        cursor.execute(query, (plugin_data['id'], plugin_data['name'], plugin_data['description'], plugin_data['version'], plugin_data['code'], 0, scope))
        conn.commit()
    except Exception:
        conn.rollback()
        return jsonify({'success': False, 'message': f"Um plugin com o ID '{plugin_data['id']}' já existe."}), 409
    finally:
        cursor.close()
        conn.close()

    return jsonify({'success': True, 'message': f"Plugin '{plugin_data['name']}' adicionado com sucesso."}), 201

@admin_bp.route('/api/plugins/<string:plugin_id>/toggle', methods=['POST'])
@admin_required
def toggle_plugin_status(plugin_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        # --- LINHA MODIFICADA ---
        # Usamos CASE para compatibilidade entre PostgreSQL (boolean) e SQLite (integer)
        query = f'UPDATE plugins SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = {placeholder}'
        cursor.execute(query, (plugin_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro ao alterar status: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
    return jsonify({'success': True, 'message': 'Status do plugin alterado com sucesso.'})

@admin_bp.route('/api/plugins/<string:plugin_id>', methods=['DELETE'])
@admin_required
def delete_plugin(plugin_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    is_postgres = hasattr(conn, 'cursor_factory')
    placeholder = '%s' if is_postgres else '?'
    
    try:
        query = f'DELETE FROM plugins WHERE id = {placeholder}'
        cursor.execute(query, (plugin_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Erro ao excluir: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
    return jsonify({'success': True, 'message': 'Plugin excluído com sucesso.'})

@admin_bp.route('/api/plugins/active_with_code', methods=['GET'])
@admin_required
def get_active_plugins_with_code():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id, name, code FROM plugins WHERE is_active = 1 ORDER BY name')
        plugins_db = cursor.fetchall()
        return jsonify([dict(row) for row in plugins_db])
    except Exception as e:
        return jsonify({'success': False, 'message': f"Erro no banco de dados: {e}"}), 500
    finally:
        if conn:
            cursor.close()
            conn.close()
